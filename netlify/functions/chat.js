// netlify/functions/chat.js

// OpenRouter pricing per 1K tokens - cheapest from each provider
const MODEL_PRICING = {
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006, name: 'GPT-4o Mini', provider: 'OpenAI' },
  'anthropic/claude-3-5-haiku-latest': { input: 0.0008, output: 0.004, name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  'google/gemini-2.0-flash-001': { input: 0.0001, output: 0.0004, name: 'Gemini 2.0 Flash', provider: 'Google' },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.0003, output: 0.0004, name: 'Llama 3.3 70B', provider: 'Meta' },
  'mistralai/mistral-small-24b-instruct-2501': { input: 0.00014, output: 0.00014, name: 'Mistral Small', provider: 'Mistral' },
  'deepseek/deepseek-chat': { input: 0.00014, output: 0.00028, name: 'DeepSeek V3', provider: 'DeepSeek' },
};

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { messages, mode, model: requestedModel } = JSON.parse(event.body);
    
    const model = MODEL_PRICING[requestedModel] ? requestedModel : DEFAULT_MODEL;
    const pricing = MODEL_PRICING[model];

    const systemPrompt = buildSystemPrompt(mode);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://azoni.ai',
        'X-Title': 'Azoni Portfolio Chat'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 1000,
        temperature: mode === 'funny' ? 0.9 : 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'API error' })
      };
    }

    const usage = data.usage || {};
    const inputCost = (usage.prompt_tokens || 0) / 1000 * pricing.input;
    const outputCost = (usage.completion_tokens || 0) / 1000 * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        model,
        modelName: pricing.name,
        provider: pricing.provider,
        usage: {
          ...usage,
          model,
          modelName: pricing.name,
          provider: pricing.provider,
          inputCost: inputCost.toFixed(6),
          outputCost: outputCost.toFixed(6),
          totalCost: totalCost.toFixed(6)
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function buildSystemPrompt(mode) {
  const toneInstructions = {
    professional: 'Be professional, concise, and highlight relevant qualifications.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a friend.',
    funny: 'Add humor and wit while still being helpful and informative.'
  };

  return `You are Azoni-GPT, an AI assistant that represents Charlton Smith, a software engineer. Your job is to answer questions about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton unless asked to roleplay as him.

TONE: ${toneInstructions[mode] || toneInstructions.professional}

CHARLTON'S PROFILE:
- Name: Charlton Smith
- Location: Seattle, WA
- Education: M.S. Software Engineering (Colorado Technical University, 2021), B.S. Computer Science (University of Washington Tacoma, 2017, Graduated with Honors)
- Experience: 7+ years as a software engineer

CURRENT FOCUS:
- LLM agents and AI-powered applications
- Tools for web3, crypto, and fintech
- Full-stack development with React and FastAPI

SKILLS:
Languages: Python, JavaScript, Java, SQL, C#
AI/ML: OpenAI APIs (GPT-4), Claude API, LLM Agents, RAG, LangChain, Prompt Engineering
Frontend: React, Vite, HTML, CSS, Mobile-First Responsive Design
Backend: Node.js, FastAPI, Django, REST APIs, Microservices
Cloud: AWS (Lambda, EC2, S3), Docker, CI/CD, Netlify, Render
Databases: PostgreSQL, MongoDB, Redis, Firebase, SQLite

WORK EXPERIENCE:
- Senior Software Engineer at Capital One (Nov 2022 - Nov 2023): Led automated testing pipelines using AWS Lambda, S3, CloudWatch. Built Python microservices. Mentored junior engineers.
- Software Engineer II at T-Mobile (Jun 2018 - Apr 2022): Built automation platform reducing workload by 80%. Designed Python/Django backend with microservices. Led Angular frontend development.
- Computer Science Instructor at Nucamp (2018): Taught full-stack development to career-transition students.
- Co-founder at OLI Fitness (2016-2018): Built computer vision fitness tracking with Kinect SDK. Published at ACM CHI 2017.

CURRENT PROJECTS:
- Old Ways Today: Full-stack AI chatbot (React, FastAPI, PostgreSQL, OpenAI) helping families find non-toxic products. Features rate limiting, token tracking, blog CMS with admin panel.
- DuMarket: Prediction market webapp with CLOB matching engine, automated market maker, real-time P&L tracking. 18 API endpoints.
- LLM-Powered Bots: Discord/Twitter bots with persistent memory, tool integration, agentic decision-making.
- Row Crew: AI fitness app using Claude's multimodal API to extract workout metrics from photos.
- Dustbunny (2021-2022): NFT bidding system across 50 machines, 2,500+ requests/minute, Redis caching.
- azoni.ai: This portfolio with AI assistant.

NOTABLE ACHIEVEMENTS:
- Published extended abstract at ACM CHI 2017 on computer vision for fitness
- 1st Place at T-Mobile Big Data Hackathon
- Co-founded OLI Fitness startup, regional finalist at Princeton Tiger Launch
- Head Organizer, Global AI Hackathon Seattle 2017

FOR RECRUITERS:
If someone pastes a job description, analyze how Charlton's experience matches the requirements and make a compelling case for why he'd be a good fit.

Keep responses concise but informative. If you don't know something specific about Charlton, say so rather than making things up.`;
}