// netlify/functions/chat.js
// RAG-Enhanced Chat with Intent Detection + Anti-Hallucination + Fitness MCP

// ============ MODEL CONFIGURATION ============
const MODEL_PRICING = {
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006, name: 'GPT-4o Mini', provider: 'OpenAI' },
  'anthropic/claude-3-5-haiku-latest': { input: 0.0008, output: 0.004, name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  'google/gemini-2.0-flash-001': { input: 0.0001, output: 0.0004, name: 'Gemini 2.0 Flash', provider: 'Google' },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.0003, output: 0.0004, name: 'Llama 3.3 70B', provider: 'Meta' },
  'mistralai/mistral-small-24b-instruct-2501': { input: 0.00014, output: 0.00014, name: 'Mistral Small', provider: 'Mistral' },
  'deepseek/deepseek-chat': { input: 0.00014, output: 0.00028, name: 'DeepSeek V3', provider: 'DeepSeek' },
};

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

// ============ MCP SERVER CONFIG ============
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'https://azoni-mcp.onrender.com';

async function callMCPTool(endpoint) {
  try {
    const response = await fetch(`${MCP_BASE_URL}${endpoint}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('MCP call failed:', error);
    return null;
  }
}

// ============ KNOWLEDGE BASE CHUNKS ============
// Each chunk has: id, category, title, content, keywords
const KNOWLEDGE_CHUNKS = [
  // EXPERIENCE CHUNKS
  {
    id: 'exp-capital-one',
    category: 'experience',
    title: 'Capital One - Senior Software Engineer',
    content: `Senior Software Engineer at Capital One (November 2022 - November 2023, Seattle WA)
- Built automated testing pipeline that processed JSON test results stored in S3, triggered by AWS Lambda functions
- Implemented CloudWatch monitoring and alerting for pipeline health
- Developed Python microservices for test orchestration and reporting
- Mentored an intern on Python best practices and AWS services
- Position ended due to company-wide layoffs affecting the team
- Technologies: Python, AWS Lambda, S3, CloudWatch, microservices architecture`,
    keywords: ['capital one', 'senior software engineer', 'aws', 'lambda', 's3', 'cloudwatch', 'python', 'testing', 'pipeline', '2022', '2023', 'layoff', 'mentor', 'intern']
  },
  {
    id: 'exp-tmobile',
    category: 'experience',
    title: 'T-Mobile - Software Engineer II',
    content: `Software Engineer II at T-Mobile (June 2018 - April 2022, Bellevue WA)
- Built internal automation platform that reduced manual workload by 80%
- Designed and implemented Python/Django backend with microservices architecture
- Led Angular frontend development for automation dashboard
- Created REST APIs consumed by multiple internal teams
- Won 1st Place at T-Mobile Big Data Hackathon
- Collaborated with cross-functional teams on enterprise solutions
- Technologies: Python, Django, Angular, REST APIs, microservices, PostgreSQL`,
    keywords: ['t-mobile', 'software engineer', 'automation', 'python', 'django', 'angular', 'hackathon', '2018', '2019', '2020', '2021', '2022', 'bellevue']
  },
  {
    id: 'exp-slalom',
    category: 'experience',
    title: 'Slalom Consulting',
    content: `Consulted at Slalom on enterprise software projects. Worked with clients on various technology solutions including cloud migrations and custom software development. Gained experience in consulting practices and client communication.`,
    keywords: ['slalom', 'consulting', 'consultant', 'enterprise']
  },
  {
    id: 'exp-nucamp',
    category: 'experience',
    title: 'Nucamp - Computer Science Instructor',
    content: `Computer Science Instructor at Nucamp Coding Bootcamp (2018)
- Taught full-stack web development to career-transition students
- Covered JavaScript, React, Node.js, MongoDB
- Helped students build portfolio projects
- Provided mentorship and career guidance`,
    keywords: ['nucamp', 'instructor', 'teacher', 'teaching', 'bootcamp', 'education', '2018']
  },
  {
    id: 'exp-oli',
    category: 'experience',
    title: 'OLI Fitness - Co-founder',
    content: `Co-founder at OLI Fitness (2016-2018)
- Built computer vision fitness tracking system using Microsoft Kinect SDK
- Developed algorithms to analyze exercise form in real-time
- Published extended abstract at ACM CHI 2017 conference
- Regional finalist at Princeton Tiger Launch startup competition
- Technologies: C#, Kinect SDK, computer vision, Unity`,
    keywords: ['oli', 'oli fitness', 'startup', 'cofounder', 'kinect', 'computer vision', 'chi', 'acm', 'princeton', '2016', '2017', '2018', 'fitness']
  },
  
  // SKILLS CHUNKS
  {
    id: 'skills-overview',
    category: 'skills',
    title: 'Technical Skills Overview',
    content: `Charlton's Core Technical Skills:
Programming Languages: Python (primary), JavaScript, TypeScript, Java, SQL, C#
AI/ML: OpenAI APIs (GPT-4), Claude API, LLM Agents, RAG systems, LangChain, Prompt Engineering, Vector Embeddings
Experience: 7+ years as a software engineer across multiple companies and domains`,
    keywords: ['skills', 'languages', 'python', 'javascript', 'java', 'programming', 'technical']
  },
  {
    id: 'skills-frontend',
    category: 'skills',
    title: 'Frontend Development Skills',
    content: `Frontend Skills:
- React (primary framework), Vite for build tooling
- HTML5, CSS3, responsive design, mobile-first approach
- State management, hooks, component architecture
- UI/UX sensibilities, accessibility considerations`,
    keywords: ['frontend', 'react', 'html', 'css', 'ui', 'ux', 'vite', 'responsive']
  },
  {
    id: 'skills-backend',
    category: 'skills',
    title: 'Backend and Infrastructure',
    content: `Backend & Infrastructure Skills:
- Python: FastAPI, Django, Flask
- Node.js, Express
- REST API design, microservices architecture
- Cloud: AWS (Lambda, EC2, S3, CloudWatch), Docker, CI/CD
- Deployment: Netlify, Render, Vercel
- Databases: PostgreSQL, MongoDB, Redis, Firebase, SQLite`,
    keywords: ['backend', 'api', 'aws', 'docker', 'database', 'postgresql', 'mongodb', 'fastapi', 'django', 'node']
  },
  
  // PROJECTS CHUNKS
  {
    id: 'proj-oldways',
    category: 'projects',
    title: 'Old Ways Today Project',
    content: `Old Ways Today - Full-stack AI Chatbot Platform
- AI-powered chatbot helping families find non-toxic, traditional products
- Built with React frontend, FastAPI backend, PostgreSQL database
- Integrated OpenAI API for intelligent product recommendations
- Features: rate limiting, token tracking, blog CMS with admin panel
- Implements RAG (Retrieval Augmented Generation) for accurate responses
- Live at oldwaystoday.com`,
    keywords: ['old ways', 'oldways', 'chatbot', 'ai', 'products', 'non-toxic', 'fastapi', 'react', 'postgresql']
  },
  {
    id: 'proj-dumarket',
    category: 'projects',
    title: 'DuMarket Prediction Market',
    content: `DuMarket - Prediction Market Platform
- Web application for prediction markets with real money mechanics
- CLOB (Central Limit Order Book) matching engine
- Automated market maker for liquidity
- Real-time P&L tracking and portfolio management
- 18 API endpoints for trading operations
- Technologies: React, Python, PostgreSQL`,
    keywords: ['dumarket', 'prediction', 'market', 'trading', 'clob', 'order book', 'betting']
  },
  {
    id: 'proj-bots',
    category: 'projects',
    title: 'LLM-Powered Bots',
    content: `LLM-Powered Social Bots
- Discord and Twitter bots with AI capabilities
- Persistent memory across conversations
- Tool integration for external actions
- Agentic decision-making and task execution
- Built with Python, LangChain, various LLM APIs`,
    keywords: ['bots', 'discord', 'twitter', 'llm', 'agent', 'langchain', 'social']
  },
  {
    id: 'proj-rowcrew',
    category: 'projects',
    title: 'Row Crew Fitness App',
    content: `Row Crew - AI Fitness Tracking App
- Uses Claude's multimodal API to extract workout metrics from photos
- Users photograph their rowing machine display
- AI extracts: distance, time, pace, strokes per minute
- Tracks progress over time with visual charts
- Technologies: React Native, Claude API, Firebase`,
    keywords: ['row crew', 'rowing', 'fitness', 'workout', 'multimodal', 'claude', 'photos', 'tracking']
  },
  {
    id: 'proj-dustbunny',
    category: 'projects',
    title: 'Dustbunny NFT System',
    content: `Dustbunny - High-Frequency NFT Bidding System (2021-2022)
- Automated NFT bidding across 50 machines simultaneously
- Handled 2,500+ requests per minute at peak
- Redis caching for performance optimization
- Built during NFT market peak
- Technologies: Python, Redis, Web3, async programming`,
    keywords: ['dustbunny', 'nft', 'bidding', 'crypto', 'web3', 'redis', 'automation', '2021', '2022']
  },
  {
    id: 'proj-portfolio',
    category: 'projects',
    title: 'azoni.ai Portfolio',
    content: `azoni.ai - Personal Portfolio Website
- This very website you're interacting with
- Features AI chatbot (Azoni-GPT) with RAG capabilities
- Built with React, Vite, deployed on Netlify
- Firebase for data persistence
- Multiple AI model support via OpenRouter`,
    keywords: ['azoni', 'portfolio', 'website', 'chatbot', 'this site']
  },
  {
    id: 'proj-benchpressonly',
    category: 'projects',
    title: 'BenchPressOnly Fitness App',
    content: `BenchPressOnly - Fitness Tracking PWA
- Progressive Web App for strength training tracking
- Features: workout logging, goal setting, coach/athlete groups
- Coaches can assign workouts and track athlete progress
- Tracks sets, reps, weight, RPE, estimated 1RMs
- Technologies: React, Firebase, Netlify Functions
- Live at benchpressonly.com
- Charlton uses this app to track his own training and coaches athletes`,
    keywords: ['benchpressonly', 'bench only', 'fitness', 'workout', 'tracking', 'coaching', 'strength', 'gym']
  },
  
  // EDUCATION CHUNKS
  {
    id: 'edu-masters',
    category: 'education',
    title: 'Masters Degree',
    content: `M.S. Software Engineering - Colorado Technical University (2021)
- Focus on software architecture and advanced programming
- Completed while working full-time at T-Mobile`,
    keywords: ['masters', 'ms', 'graduate', 'colorado', 'ctu', '2021', 'software engineering']
  },
  {
    id: 'edu-bachelors',
    category: 'education',
    title: 'Bachelors Degree',
    content: `B.S. Computer Science - University of Washington Tacoma (2017)
- Graduated with Honors
- Active in hackathons and student organizations
- Head Organizer for Global AI Hackathon Seattle 2017`,
    keywords: ['bachelors', 'bs', 'undergraduate', 'uw', 'washington', 'tacoma', '2017', 'honors', 'hackathon']
  },
  
  // PERSONAL/CONTACT
  {
    id: 'personal-contact',
    category: 'personal',
    title: 'Contact Information',
    content: `Contact Charlton:
- Email: charltonuw@gmail.com
- Location: Seattle, WA
- LinkedIn: linkedin.com/in/charltonsmith
- GitHub: github.com/charltonaustin (or similar)
- Portfolio: azoni.ai`,
    keywords: ['contact', 'email', 'linkedin', 'github', 'seattle', 'location', 'reach', 'hire']
  },
  {
    id: 'personal-interests',
    category: 'personal',
    title: 'Interests and Background',
    content: `About Charlton:
- Based in Seattle, WA
- Passionate about AI/LLM applications
- Enjoys building tools that solve real problems
- Interests: crypto/web3, fitness tech, prediction markets
- Currently focused on AI agents and automation`,
    keywords: ['about', 'interests', 'hobbies', 'background', 'seattle', 'personal']
  }
];

// ============ INTENT DETECTION ============
function detectIntent(query) {
  const q = query.toLowerCase();
  
  // PRIORITY 0: Fitness/BenchPressOnly queries (check first for live data)
  const fitnessTriggers = [
    // Workouts
    'workout', 'workouts', 'training', 'session', 'sessions', 'routine',
    // Gym/fitness general
    'fitness', 'gym', 'exercise', 'exercises',
    // Lifting
    'lift', 'lifting', 'lifts', 'bench', 'bench press', 'squat', 'deadlift', 'overhead press',
    // Strength/PRs
    'pr', 'personal record', 'max', '1rm', 'one rep max', 'strongest', 'strength', 'strong', 'how much can', 'how much does',
    // Coaching (synonyms)
    'coach', 'coaching', 'trainer', 'training clients', 'athlete', 'athletes', 'clients', 'trains',
    // App specific
    'benchpressonly', 'bench only', 'benchonly',
    // Goals
    'goals', 'goal', 'target', 'targets',
    // Consistency
    'discipline', 'consistent', 'consistency', 'streak', 'dedication', 'committed',
    // Weight
    'weight', 'weights', 'heavy', 'heavier', 'pounds', 'lbs',
    // Reps/sets
    'reps', 'sets', 'volume'
  ];
  if (fitnessTriggers.some(t => q.includes(t))) {
    return { intent: 'fitness', confidence: 'HIGH', reason: 'fitness_keyword' };
  }
  
  // PRIORITY 1: Company name triggers → experience
  const companyTriggers = [
    'capital one', 'capitalone', 
    't-mobile', 'tmobile', 't mobile',
    'slalom',
    'nucamp',
    'oli fitness', 'oli'
  ];
  if (companyTriggers.some(t => q.includes(t))) {
    return { intent: 'experience', confidence: 'HIGH', reason: 'company_name' };
  }
  
  // PRIORITY 2: Explicit job/work phrases → experience
  const experiencePatterns = [
    /work(ed)?\s+(at|for|with)/,
    /job\s+(at|with)/,
    /role\s+(at|with)/,
    /experience\s+(at|with)/,
    /position\s+(at|with)/,
    /employed\s+(at|by)/,
    /previous\s+(job|role|position|employer)/,
    /work\s+history/,
    /career/,
    /employment/
  ];
  if (experiencePatterns.some(p => p.test(q))) {
    return { intent: 'experience', confidence: 'HIGH', reason: 'work_pattern' };
  }
  
  // PRIORITY 3: Project name triggers → projects
  const projectTriggers = [
    'old ways', 'oldways',
    'dumarket', 'du market',
    'dustbunny', 'dust bunny',
    'row crew', 'rowcrew',
    'azoni',
    'prediction market',
    'nft',
    'discord bot', 'twitter bot',
    'embed route', 'embedroute'
  ];
  if (projectTriggers.some(t => q.includes(t))) {
    return { intent: 'projects', confidence: 'HIGH', reason: 'project_name' };
  }
  
  // PRIORITY 4: Education keywords
  const educationTriggers = ['degree', 'university', 'college', 'school', 'graduate', 'study', 'studied', 'education', 'masters', 'bachelors', 'uw', 'colorado'];
  if (educationTriggers.some(t => q.includes(t))) {
    return { intent: 'education', confidence: 'HIGH', reason: 'education_keyword' };
  }
  
  // PRIORITY 5: Skill-specific queries
  const skillsPatterns = [
    /what (languages?|technologies?|tools?|frameworks?)/,
    /can (he|charlton) (use|code|program|work with)/,
    /does (he|charlton) know/,
    /skills?/,
    /tech stack/,
    /proficien/
  ];
  if (skillsPatterns.some(p => p.test(q))) {
    return { intent: 'skills', confidence: 'MEDIUM', reason: 'skills_pattern' };
  }
  
  // PRIORITY 6: Contact/hiring
  const contactTriggers = ['contact', 'email', 'hire', 'hiring', 'reach', 'linkedin', 'github', 'resume'];
  if (contactTriggers.some(t => q.includes(t))) {
    return { intent: 'contact', confidence: 'HIGH', reason: 'contact_keyword' };
  }
  
  // PRIORITY 7: General about/background
  const generalTriggers = ['who is', 'tell me about', 'background', 'about charlton', 'introduce'];
  if (generalTriggers.some(t => q.includes(t))) {
    return { intent: 'general', confidence: 'MEDIUM', reason: 'general_about' };
  }
  
  // Default: general with low confidence
  return { intent: 'general', confidence: 'LOW', reason: 'no_match' };
}

// ============ CHUNK RETRIEVAL ============
function retrieveChunks(query, intent, maxChunks = 5) {
  const q = query.toLowerCase();
  const results = [];
  
  // Score each chunk
  for (const chunk of KNOWLEDGE_CHUNKS) {
    let score = 0;
    
    // Category match bonus
    if (intent.intent === 'experience' && chunk.category === 'experience') score += 30;
    if (intent.intent === 'projects' && chunk.category === 'projects') score += 30;
    if (intent.intent === 'skills' && chunk.category === 'skills') score += 30;
    if (intent.intent === 'education' && chunk.category === 'education') score += 30;
    if (intent.intent === 'contact' && chunk.category === 'personal') score += 30;
    if (intent.intent === 'fitness' && chunk.id === 'proj-benchpressonly') score += 30;
    if (intent.intent === 'general') score += 5; // Small bonus for all in general queries
    
    // Keyword matching
    for (const keyword of chunk.keywords) {
      if (q.includes(keyword)) {
        score += 15;
        // Extra boost for exact important matches
        if (keyword.length > 5) score += 5;
      }
    }
    
    // Title matching
    if (chunk.title.toLowerCase().split(' ').some(word => q.includes(word) && word.length > 3)) {
      score += 20;
    }
    
    // Content snippet matching (check if query words appear in content)
    const queryWords = q.split(/\s+/).filter(w => w.length > 3);
    const contentLower = chunk.content.toLowerCase();
    for (const word of queryWords) {
      if (contentLower.includes(word)) score += 3;
    }
    
    if (score > 0) {
      results.push({ ...chunk, score });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  // Return top chunks
  return results.slice(0, maxChunks);
}

// ============ FITNESS DATA RETRIEVAL ============
async function getFitnessContext(query) {
  const q = query.toLowerCase();
  const context = [];
  const toolsCalled = [];
  
  const username = 'azoni';
  
  // Coaching queries
  const isCoachQuery = q.includes('coach') || q.includes('trainer') || q.includes('athlete') || 
                       q.includes('clients') || q.includes('trains') || q.includes('training clients');
  
  // Max/PR queries
  const isMaxQuery = q.includes('max') || q.includes('pr') || q.includes('1rm') || 
                     q.includes('strongest') || q.includes('best lift') || q.includes('how much') ||
                     q.includes('bench') || q.includes('squat') || q.includes('deadlift');
  
  // Goal queries
  const isGoalQuery = q.includes('goal') || q.includes('target');
  
  // Workout queries
  const isWorkoutQuery = q.includes('workout') || q.includes('session') || q.includes('routine');
  
  // Streak/consistency queries
  const isStreakQuery = q.includes('streak') || q.includes('consistent') || q.includes('discipline') || 
                        q.includes('dedicated') || q.includes('commitment');
  
  // Volume queries
  const isVolumeQuery = q.includes('volume') || q.includes('sets') || q.includes('reps') || q.includes('tonnage');
  
  // Exercise queries
  const isExerciseQuery = q.includes('exercise') || q.includes('favorite') || q.includes('most trained');
  
  // Body/profile queries
  const isBodyQuery = q.includes('weigh') || q.includes('weight') || q.includes('tall') || q.includes('height') || 
                      q.includes('bmi') || q.includes('body');
  
  // Profile queries
  const isProfileQuery = q.includes('profile') || q.includes('about') || q.includes('who is') || 
                         q.includes('member') || q.includes('how long');
  
  try {
    if (isCoachQuery) {
      const summary = await callMCPTool(`/benchpressonly/coach/${username}`);
      if (summary && !summary.error) {
        context.push({ title: 'Coaching Overview', data: summary });
        toolsCalled.push('get_coach_summary');
      }
      
      const athletes = await callMCPTool(`/benchpressonly/coach/${username}/athletes`);
      if (athletes && !athletes.error) {
        context.push({ title: 'Athlete Progress', data: athletes });
        toolsCalled.push('get_athlete_progress');
      }
    }
    
    if (isMaxQuery) {
      const maxes = await callMCPTool(`/benchpressonly/maxes/${username}`);
      if (maxes && !maxes.error) {
        context.push({ title: 'Personal Records', data: maxes });
        toolsCalled.push('get_max_lifts');
      }
    }
    
    if (isGoalQuery) {
      const goals = await callMCPTool(`/benchpressonly/goals/${username}`);
      if (goals && !goals.error) {
        context.push({ title: 'Fitness Goals', data: goals });
        toolsCalled.push('get_goals');
      }
    }
    
    if (isStreakQuery) {
      const streak = await callMCPTool(`/benchpressonly/streak/${username}`);
      if (streak && !streak.error) {
        context.push({ title: 'Workout Streak', data: streak });
        toolsCalled.push('get_streak');
      }
      
      const consistency = await callMCPTool(`/benchpressonly/consistency/${username}`);
      if (consistency && !consistency.error) {
        context.push({ title: 'Training Consistency', data: consistency });
        toolsCalled.push('get_consistency');
      }
    }
    
    if (isVolumeQuery) {
      const volume = await callMCPTool(`/benchpressonly/volume/${username}`);
      if (volume && !volume.error) {
        context.push({ title: 'Training Volume', data: volume });
        toolsCalled.push('get_training_volume');
      }
    }
    
    if (isExerciseQuery) {
      const exercises = await callMCPTool(`/benchpressonly/exercises/${username}`);
      if (exercises && !exercises.error) {
        context.push({ title: 'Top Exercises', data: exercises });
        toolsCalled.push('get_top_exercises');
      }
    }
    
    if (isBodyQuery) {
      const body = await callMCPTool(`/benchpressonly/body/${username}`);
      if (body && !body.error) {
        context.push({ title: 'Body Stats', data: body });
        toolsCalled.push('get_body_stats');
      }
    }
    
    if (isProfileQuery) {
      const profile = await callMCPTool(`/benchpressonly/profile/${username}`);
      if (profile && !profile.error) {
        context.push({ title: 'Fitness Profile', data: profile });
        toolsCalled.push('get_user_profile');
      }
    }
    
    if (isWorkoutQuery || context.length === 0) {
      const workouts = await callMCPTool(`/benchpressonly/workouts/${username}`);
      if (workouts && !workouts.error) {
        context.push({ title: 'Recent Workouts', data: workouts });
        toolsCalled.push('get_recent_workouts');
      }
    }
  } catch (error) {
    console.error('Fitness context error:', error);
  }
  
  return { context, toolsCalled };
}

// ============ SYSTEM PROMPT BUILDER ============
function buildSystemPrompt(mode, retrievedChunks, intent, fitnessData = []) {
  const toneInstructions = {
    professional: 'Be professional, concise, and highlight relevant qualifications.',
    friendly: 'Be warm and approachable while remaining informative.',
    casual: 'Be relaxed and conversational, like talking to a friend.',
    funny: 'Add humor and wit while still being helpful and informative.'
  };

  const contextSection = retrievedChunks.length > 0
    ? `\n\nRETRIEVED CONTEXT (use ONLY this information to answer):\n${retrievedChunks.map(c => `--- ${c.title} ---\n${c.content}`).join('\n\n')}`
    : '';

  const fitnessSection = fitnessData.length > 0
    ? `\n\nLIVE FITNESS DATA (from BenchPressOnly app - use these real numbers):\n${fitnessData.map(f => `--- ${f.title} ---\n${JSON.stringify(f.data, null, 2)}`).join('\n\n')}`
    : '';

  return `You are Azoni-GPT, an AI assistant representing Charlton Smith, a software engineer in Seattle. Answer questions about Charlton's background, skills, projects, and experience. Always speak in third person about Charlton.

TONE: ${toneInstructions[mode] || toneInstructions.professional}

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY use information from the RETRIEVED CONTEXT and LIVE FITNESS DATA below. Do not make up details.
2. If the context doesn't contain specific information about what the user is asking, say "I don't have detailed information about that in my knowledge base" and suggest they contact Charlton directly.
3. NEVER invent dates, job titles, company names, or responsibilities that aren't in the context.
4. NEVER fabricate project details, technologies, or achievements.
5. If you're unsure, say so. It's better to be honest than to hallucinate.
6. For fitness questions, use the LIVE FITNESS DATA to give specific, real numbers. This data is pulled in real-time from Charlton's BenchPressOnly app.
7. When discussing fitness data, mention that this is live data from his actual training log.
${contextSection}
${fitnessSection}

BASIC INFO (always available):
- Name: Charlton Smith
- Location: Seattle, WA
- Email: charltonuw@gmail.com
- Experience: 7+ years software engineering

If asked about something not in the context, acknowledge the limitation and offer to help with what you do know.`;
}

// ============ MAIN HANDLER ============
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

    // Get the latest user message for intent detection
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Detect intent
    const intent = detectIntent(latestUserMessage);
    
    // Retrieve relevant chunks
    const retrievedChunks = retrieveChunks(latestUserMessage, intent);
    
    // Fetch fitness data if relevant
    let fitnessContext = [];
    let fitnessToolsCalled = [];
    if (intent.intent === 'fitness') {
      const fitnessResult = await getFitnessContext(latestUserMessage);
      fitnessContext = fitnessResult.context;
      fitnessToolsCalled = fitnessResult.toolsCalled;
    }
    
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(mode, retrievedChunks, intent, fitnessContext);

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

    // Format RAG data for frontend display
    const maxScore = Math.max(...retrievedChunks.map(c => c.score), 1);
    const topChunks = retrievedChunks.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      similarity: Math.min(c.score / maxScore, 1.0).toFixed(2)
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        model,
        modelName: pricing.name,
        provider: pricing.provider,
        // RAG debug info
        _rag: {
          enabled: true,
          intent: intent.intent,
          intentConfidence: intent.confidence,
          reason: intent.reason,
          chunksRetrieved: retrievedChunks.length,
          topChunks: topChunks
        },
        // Fitness/MCP debug info
        _fitness: {
          enabled: fitnessContext.length > 0,
          source: 'azoni-mcp (BenchPressOnly)',
          toolsCalled: fitnessToolsCalled,
          dataPoints: fitnessContext.map(f => f.title)
        },
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