// netlify/functions/chat.js

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { messages, mode } = JSON.parse(event.body);

    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
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
      console.error('OpenAI error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'OpenAI API error' })
      };
    }

    // Calculate cost (GPT-4 pricing: $0.03/1K input, $0.06/1K output)
    const usage = data.usage || {};
    const inputCost = (usage.prompt_tokens || 0) / 1000 * 0.03;
    const outputCost = (usage.completion_tokens || 0) / 1000 * 0.06;
    const totalCost = inputCost + outputCost;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        usage: {
          ...usage,
          inputCost: inputCost.toFixed(4),
          outputCost: outputCost.toFixed(4),
          totalCost: totalCost.toFixed(4)
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
- Rowing Tracker: AI fitness app using Claude's multimodal API to extract workout metrics from photos.
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