// netlify/functions/chat-stream.mjs
// Streaming chat endpoint (Netlify Functions v2) with LLM tool-calling for live MCP data.
//
// Emits Server-Sent Events:
//   event: token   data: { text }       -> incremental answer text
//   event: status  data: { text }       -> progress note while gathering live data
//   event: meta    data: { _rag, usage, modelName, provider, content }
//   event: done    data: {}
//   event: error   data: { message }
//
// The non-streaming /chat endpoint remains the fallback (see useChat.js): if this
// endpoint errors or streaming isn't available, the frontend retries /chat.

// esbuild bundles this ESM entry with CJS deps (chat-core -> firebase-admin) and
// rewrites Node built-in requires (fs/crypto/...) inside those deps to a shim that
// re-checks `typeof require` at call time. Without a runtime require binding, every
// such call throws "Dynamic require of ... is not supported" — which silently broke
// ALL Firestore access in this function (no RAG, no logging). Keep this shim first.
import { createRequire } from 'node:module';
if (typeof globalThis.require === 'undefined') globalThis.require = createRequire(import.meta.url);

import core from './chat-core.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Intents where live data is worth a model-driven tool-calling round. fitness and
// activity are NOT here: they are pre-fetched server-side before the stream starts
// (single round, ~3s to first token) instead of burning 10s+ on tool rounds.
const LIVE_DATA_INTENTS = new Set([
  'agents', 'fabstats', 'rowcrew', 'spellbrigade', 'moltbook', 'oldways',
]);

// Total budget for pre-stream work (tool rounds + MCP calls). Netlify kills the
// function at ~30s; first tokens must always beat that, so stop gathering context
// and start streaming once this much wall clock has elapsed.
const PRESTREAM_BUDGET_MS = 15000;

// Best-effort per-IP throttle (per warm container). Keep in sync with chat.js.
const rateBuckets = new Map();
function isRateLimited(ip, limit = 30, windowMs = 5 * 60 * 1000) {
  if (!ip) return false;
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) { if (now > v.resetAt) rateBuckets.delete(k); }
  }
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const clientIp = req.headers.get('x-nf-client-connection-ip') || '';
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  let payload = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const {
    messages: rawMessages = [],
    mode,
    model: requestedModel,
    context: requestContext,
    sessionId: requestSessionId,
    fast = false,
  } = payload;

  const t0 = Date.now();

  const model = core.MODEL_PRICING[requestedModel] ? requestedModel : core.DEFAULT_MODEL;
  const pricing = core.MODEL_PRICING[model];
  const messages = core.sanitizeChatMessages(rawMessages);
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const isFastRequest = fast === true || requestContext === 'home-hero' || requestContext === 'fast';
  const modelMessages = core.selectModelMessages(messages, isFastRequest);

  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY;
  if (!openRouterKey || !latestUserMessage) {
    // Signal the frontend to fall back to the non-streaming /chat endpoint.
    return new Response(JSON.stringify({ error: 'stream_unavailable' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  // ---- Retrieval (same RAG pipeline as /chat) + pre-fetched live context ----
  // fitness/activity context is fetched here, in parallel with RAG retrieval, so
  // those intents stream in one model round instead of slow tool-calling rounds.
  const intent = core.detectIntent(latestUserMessage);
  const prefetchLive = intent.intent === 'fitness' || intent.intent === 'activity';
  const [retrievedChunks, liveContext] = await Promise.all([
    core.retrieveChunks(latestUserMessage, intent, isFastRequest ? 3 : 5, {
      useEmbedding: !isFastRequest,
      chunkTimeoutMs: isFastRequest ? 1200 : 4000,
    }),
    (async () => {
      if (!prefetchLive) return { context: [], toolsCalled: [] };
      try {
        const fetcher = intent.intent === 'fitness' ? core.getFitnessContext : core.getActivityContext;
        return await core.promiseWithTimeout(
          fetcher(latestUserMessage, { mcpTimeoutMs: 3000 }),
          8000,
          'live context prefetch'
        );
      } catch (err) {
        console.error('[chat-stream] live context prefetch failed:', err.message);
        return { context: [], toolsCalled: [] };
      }
    })(),
  ]);

  const fitnessData = intent.intent === 'fitness' ? liveContext.context : [];
  const activityData = intent.intent === 'activity' ? liveContext.context : [];
  const prefetchedTools = liveContext.toolsCalled || [];

  const systemPrompt = core.buildSystemPrompt(mode, retrievedChunks, intent, fitnessData, activityData, [], false, {
    isFastRequest,
    requestContext,
    userFormatInstruction: core.getUserFormatInstruction(latestUserMessage),
  });

  const maxScore = Math.max(...retrievedChunks.map((c) => c.score), 1);
  const topChunks = retrievedChunks.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    similarity: c.vectorSimilarity != null ? c.vectorSimilarity.toFixed(3) : Math.min(c.score / maxScore, 1.0).toFixed(2),
    method: c.vectorSimilarity != null ? 'vector' : 'keyword',
  }));
  // Honest degradation signal: when every chunk is a hardcoded fallback (Firestore
  // unreachable), say so instead of reporting healthy 'keyword' retrieval.
  const kbLoaded = retrievedChunks.some((c) => !String(c.id || '').startsWith('fallback-'));

  const useTools = !isFastRequest && LIVE_DATA_INTENTS.has(intent.intent);
  const temperatureField = core.supportsCustomTemperature(model)
    ? { temperature: mode === 'funny' ? 0.85 : 0.45 }
    : {};

  const orHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${openRouterKey}`,
    'HTTP-Referer': 'https://azoni.ai',
    'X-Title': 'Azoni Portfolio Chat (stream)',
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      const conversation = [{ role: 'system', content: systemPrompt }, ...modelMessages];
      const toolsCalled = [...prefetchedTools];
      const liveData = (fitnessData.length ? fitnessData : activityData).map((c) => c.title);
      // Tool-round token usage would otherwise be dropped — accumulate it so the
      // logged cost covers the full turn, not just the final completion.
      let extraPrompt = 0;
      let extraCompletion = 0;

      try {
        // ---- Tool-calling rounds (non-streamed) for live-data intents ----
        // Hard-bounded: each round 6s, each MCP call 3s, and the whole pre-stream
        // phase stops at PRESTREAM_BUDGET_MS so first tokens beat the platform kill.
        if (useTools) {
          send('status', { text: 'Checking live data…' });
          for (let round = 0; round < 2; round++) {
            if (Date.now() - t0 > PRESTREAM_BUDGET_MS) break;
            const resp = await core.fetchWithTimeout(OPENROUTER_URL, {
              method: 'POST',
              headers: orHeaders,
              body: JSON.stringify({
                model,
                messages: conversation,
                tools: core.TOOL_DEFINITIONS,
                tool_choice: 'auto',
                max_tokens: 1200,
                ...(/gpt-5|o1|o3|o4/i.test(model) ? { reasoning: { effort: 'low' } } : {}),
                ...temperatureField,
              }),
            }, 6000);

            const data = await core.readJsonResponse(resp, 'OpenRouter tool round');
            if (data.usage) {
              extraPrompt += data.usage.prompt_tokens || 0;
              extraCompletion += data.usage.completion_tokens || 0;
            }
            const choice = data.choices?.[0];
            const requestedCalls = choice?.message?.tool_calls;
            if (!choice || !requestedCalls || requestedCalls.length === 0) break;

            conversation.push(choice.message);
            for (const tc of requestedCalls) {
              // Over budget: still answer EVERY tool_call_id — an assistant message
              // with unanswered tool_calls makes the final completion 400.
              if (Date.now() - t0 > PRESTREAM_BUDGET_MS) {
                conversation.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: tc.function?.name,
                  content: '{"error":"time budget exceeded, live data unavailable"}',
                });
                continue;
              }
              let args = {};
              try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { args = {}; }
              const result = await core.executeToolCall(tc.function?.name, args, { mcpTimeoutMs: 3000 });
              toolsCalled.push(tc.function?.name);
              (result.context || []).forEach((c) => liveData.push(c.title));
              conversation.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.function?.name,
                content: JSON.stringify(result.context || []),
              });
            }
          }
        }

        // ---- Final streamed completion (no tools — force a text answer) ----
        // fetchWithTimeout only bounds time-to-headers; body streaming is unaffected.
        const streamResp = await core.fetchWithTimeout(OPENROUTER_URL, {
          method: 'POST',
          headers: orHeaders,
          body: JSON.stringify({
            model,
            messages: conversation,
            stream: true,
            // Reasoning tokens count against max_tokens on gpt-5-mini; give headroom + cap effort so
            // the answer isn't truncated (finish_reason:'length') before any text streams.
            max_tokens: isFastRequest ? 600 : 1400,
            ...(/gpt-5|o1|o3|o4/i.test(model) ? { reasoning: { effort: 'low' } } : {}),
            ...temperatureField,
          }),
        }, 12000);

        if (!streamResp.ok || !streamResp.body) {
          const errText = await streamResp.text().catch(() => '');
          throw new Error(`upstream stream failed (${streamResp.status}): ${errText.slice(0, 200)}`);
        }

        const reader = streamResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let usage = null;
        let finishReason = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const json = JSON.parse(dataStr);
              const choice0 = json.choices?.[0];
              const delta = choice0?.delta?.content;
              if (delta) {
                fullText += delta;
                send('token', { text: delta });
              }
              if (choice0?.finish_reason) finishReason = choice0.finish_reason;
              if (json.usage) usage = json.usage;
            } catch {
              // partial/keepalive line — ignore
            }
          }
        }

        // A dead upstream (or reasoning burn-out) can close cleanly with zero text.
        // Throw so the client's /chat fallback produces a real answer instead of
        // this turn silently finalizing empty.
        if (!fullText.trim()) {
          throw new Error(`empty completion from upstream (finish_reason: ${finishReason || 'unknown'})`);
        }

        const u = usage || {};
        const promptTokens = (u.prompt_tokens || 0) + extraPrompt;
        const completionTokens = (u.completion_tokens || 0) + extraCompletion;
        const fullUsage = {
          ...u,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        };
        const inputCost = (promptTokens / 1000) * pricing.input;
        const outputCost = (completionTokens / 1000) * pricing.output;
        const totalCost = inputCost + outputCost;

        send('meta', {
          modelName: pricing.name,
          provider: pricing.provider,
          content: fullText,
          finishReason,
          _rag: {
            enabled: true,
            retrievalMethod: !kbLoaded
              ? 'fallback'
              : retrievedChunks.some((c) => c.vectorSimilarity != null) ? 'vector' : 'keyword',
            kbLoaded,
            intent: intent.intent,
            intentConfidence: intent.confidence,
            reason: intent.reason,
            chunksRetrieved: retrievedChunks.length,
            topChunks,
            toolsCalled,
            liveData,
            streamed: true,
          },
          usage: {
            ...fullUsage,
            model,
            modelName: pricing.name,
            provider: pricing.provider,
            inputCost: inputCost.toFixed(6),
            outputCost: outputCost.toFixed(6),
            totalCost: totalCost.toFixed(6),
          },
        });

        // Server-side logging BEFORE closing the stream: the Lambda freezes right
        // after the response ends, so post-close writes were silently lost. Time-cap
        // it so a slow Firestore can only delay the done event, never the tokens.
        const logTail = Promise.allSettled([
          core.logChatActivity({
            userMessage: latestUserMessage,
            assistantMessage: fullText,
            model,
            usage: fullUsage,
            intent,
            chunksUsed: topChunks.length,
            requestContext,
            totalCost,
          }),
          core.logChatTurn({
            sessionId: requestSessionId,
            userMessage: latestUserMessage,
            assistantMessage: fullText,
            mode,
            model,
            modelName: pricing.name,
            usage: fullUsage,
            intent,
            chunksUsed: topChunks.length,
            requestContext,
            totalCost,
            streamed: true,
          }),
          core.logKnowledgeGap({
            query: latestUserMessage,
            intent,
            retrievedChunks,
            assistantMessage: fullText,
          }),
        ]);
        await Promise.race([logTail, new Promise((r) => setTimeout(r, 2500))]);

        send('done', {});
        controller.close();
      } catch (err) {
        console.error('[chat-stream] error:', err.message);
        send('error', { message: err.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
