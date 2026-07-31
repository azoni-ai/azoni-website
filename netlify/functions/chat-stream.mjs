// netlify/functions/chat-stream.mjs
// Streaming chat endpoint (Netlify Functions v2) with LLM tool-calling for live MCP data.
//
// Emits Server-Sent Events:
//   event: token  data: { text }       -> incremental answer text
//   event: meta   data: { _rag, usage, modelName, provider, content }
//   event: done   data: {}
//   event: error  data: { message }
//
// The non-streaming /chat endpoint remains the fallback (see useChat.js): if this
// endpoint errors or streaming isn't available, the frontend retries /chat.

import core from './chat-core.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Intents where live data is worth a tool-calling round. Everything else streams
// straight from RAG context (one upstream call, no wasted tool probe).
const LIVE_DATA_INTENTS = new Set([
  'fitness', 'activity', 'agents', 'fabstats', 'rowcrew', 'spellbrigade', 'moltbook', 'oldways',
]);

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  let payload = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const {
    messages: rawMessages = [],
    mode,
    model: requestedModel,
    context: requestContext,
    fast = false,
  } = payload;

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

  // ---- Retrieval (same RAG pipeline as /chat) ----
  const intent = core.detectIntent(latestUserMessage);
  const retrievedChunks = await core.retrieveChunks(latestUserMessage, intent, isFastRequest ? 3 : 5, {
    useEmbedding: !isFastRequest,
    chunkTimeoutMs: isFastRequest ? 1200 : 4000,
  });

  const systemPrompt = core.buildSystemPrompt(mode, retrievedChunks, intent, [], [], [], false, {
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
      const toolsCalled = [];
      const liveData = [];

      try {
        // ---- Tool-calling rounds (non-streamed) for live-data intents ----
        if (useTools) {
          for (let round = 0; round < 2; round++) {
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
            }, 12000);

            const data = await core.readJsonResponse(resp, 'OpenRouter tool round');
            const choice = data.choices?.[0];
            const requestedCalls = choice?.message?.tool_calls;
            if (!choice || !requestedCalls || requestedCalls.length === 0) break;

            conversation.push(choice.message);
            for (const tc of requestedCalls) {
              let args = {};
              try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { args = {}; }
              const result = await core.executeToolCall(tc.function?.name, args, { mcpTimeoutMs: 5000 });
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
        const streamResp = await fetch(OPENROUTER_URL, {
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
        });

        if (!streamResp.ok || !streamResp.body) {
          const errText = await streamResp.text().catch(() => '');
          throw new Error(`upstream stream failed (${streamResp.status}): ${errText.slice(0, 200)}`);
        }

        const reader = streamResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let usage = null;

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
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                send('token', { text: delta });
              }
              if (json.usage) usage = json.usage;
            } catch {
              // partial/keepalive line — ignore
            }
          }
        }

        const u = usage || {};
        const inputCost = ((u.prompt_tokens || 0) / 1000) * pricing.input;
        const outputCost = ((u.completion_tokens || 0) / 1000) * pricing.output;
        const totalCost = inputCost + outputCost;

        send('meta', {
          modelName: pricing.name,
          provider: pricing.provider,
          content: fullText,
          _rag: {
            enabled: true,
            retrievalMethod: retrievedChunks.some((c) => c.vectorSimilarity != null) ? 'vector' : 'keyword',
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
            ...u,
            model,
            modelName: pricing.name,
            provider: pricing.provider,
            inputCost: inputCost.toFixed(6),
            outputCost: outputCost.toFixed(6),
            totalCost: totalCost.toFixed(6),
          },
        });
        send('done', {});
        controller.close();

        // Best-effort server-side activity logging (feeds cost + live-map dashboards).
        core.logChatActivity({
          userMessage: latestUserMessage,
          assistantMessage: fullText,
          model,
          usage: u,
          intent,
          chunksUsed: topChunks.length,
          requestContext,
          totalCost,
        }).catch(() => {});
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
