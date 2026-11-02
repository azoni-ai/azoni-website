// visibility decides where a project appears. Nothing is deleted from this
// list; entries leave the public path by changing visibility instead.
//   featured  case study on /projects, with prev/next inside the featured set
//   other     "Other things I've built" on /projects
//   earlier   "Earlier work" on /projects
//   unlisted  page still renders, marked noindex, linked from nowhere
//   merged    content lives on another page; redirectTo matches public/_redirects
export const PROOF_AS_OF = 'November 2026';
// Chrome Web Store users of the FaB Stats GEM Exporter, as of PROOF_AS_OF.
const GEM_EXPORTER_USERS = 793;

export const projects = [
  {
    id: 'fab-stats',
    visibility: 'featured',
    displayOrder: 1,
    metric: { value: '3,898', label: 'players' },
    proof: {
      asOf: PROOF_AS_OF,
      items: [
        { value: '3,898', label: 'players' },
        { value: '1,634,956', label: 'matches tracked' },
        { value: GEM_EXPORTER_USERS.toLocaleString('en-US'), label: 'GEM Exporter users' },
      ],
    },
    facts: { years: '2023 – present', role: 'Solo: design, build and operate', status: 'Live' },
    discordBot: { key: 'fabstats-bot', servers: 12, members: 1309, asOf: PROOF_AS_OF },
    gemExporter: { key: 'fabstats-gem', users: GEM_EXPORTER_USERS, asOf: PROOF_AS_OF },
    title: 'FaB Stats',
    tagline: 'Stats site and Discord bot for the Flesh and Blood TCG.',
    description: 'Stats platform for competitive Flesh and Blood, with about 3,900 players and 1.6 million matches tracked as of November 2026. Match logging, hero performance, matchup win rates, leaderboards and daily minigames.',
    longDescription: `I built FaB Stats because the Flesh and Blood community argued about the meta with no shared data.

Players log matches, browse hero-level performance, compare matchup win rates, and climb leaderboards. There's a Chrome extension that imports a tournament bracket in one click, a Discord bot for community servers, and a rotating set of daily puzzle minigames (FaBdoku, Bladedash, Brutebrawl) that people play in the morning.`,
    tech: ['Next.js', 'React', 'TypeScript', 'Firebase', 'Netlify Functions', 'Satori', 'Discord.js'],
    highlights: [
      'Chrome extension imports a whole tournament in one click',
      'Companion Discord bot with 24 slash commands',
      'Daily minigames with seeded RNG and Satori-generated OG images',
      'Hero-level analytics and matchup data'
    ],
    links: {
      live: 'https://fabstats.net',
      github: null
    },
    image: '/images/fabstats-icon.svg',
    featured: true,
    category: 'games',
    caseStudy: {
      role: 'Solo — design, build, and operate',
      timeline: '2023 – present',
      stack: 'Next.js · Firestore · Netlify Functions · Chrome extension',
      sections: [
        {
          heading: 'The problem',
          body: `Competitive Flesh and Blood players argue about the metagame constantly, but it's mostly anecdote with no shared data behind it. The hard part is that nobody wants to hand-enter matches after a long tournament day, so most tools go unused.`,
        },
        {
          heading: 'Constraints',
          body: `I built it solo, with no budget, for a niche audience. It had to run on free tiers, and signing up had to be easy. Two things followed from that: logging a match had to be almost automatic, and I had to stay under Firestore's free read quota.`,
        },
        {
          heading: 'Approach and key decisions',
          body: `I made logging a match as close to automatic as I could, then built the analytics and community features on top of that.`,
          decisions: [
            'A one-click Chrome extension that imports a whole tournament bracket, so players don\'t type matches in by hand. It\'s the main reason people use it.',
            'Firestore over SQL for real-time updates and the free tier. To stay under the read quota, public pages serve cached summary documents with CDN headers instead of live listeners.',
            'A Discord bot, since the community already lives in Discord.',
            'Daily seeded minigames (FaBdoku, Bladedash) to give people a reason to come back between events.',
          ],
        },
        {
          heading: 'Architecture',
          body: `The site is a Next.js static export on Netlify. Aggregation and Satori share images run in Netlify Functions. Firestore holds the data, and public pages read cached summary docs so per-visitor reads stay low. The Chrome extension does bulk import. The Discord bot runs on Railway with a watchdog that restarts the gateway session if it goes stale.`,
        },
        {
          heading: 'The Discord bot',
          icon: '/images/fabstats-bot.png',
          botReach: true,
          body: `The companion bot answers hero stats, matchup queries and leaderboards directly in Discord, so nobody has to leave the channel. It has 24 slash commands with autocomplete on every searchable parameter. A background scheduler heartbeats every minute, and per-command analytics show me which queries get used. It's written in TypeScript with Discord.js and Firebase Admin.`,
        },
        {
          heading: 'Outcomes',
          body: `As of November 2026, FaB Stats has about 3,900 registered players and 1.6 million matches, and the GEM Exporter extension has 793 users. People now cite it in meta arguments instead of going on feel.`,
        },
        {
          heading: 'What I’d do differently',
          body: `I'd compute matchup aggregates server-side from the start. My early client-side increment over-counts on full re-imports, and I've had to work around it. I'd also enable point-in-time recovery up front.`,
        },
      ],
    },
  },
  {
    id: 'embedroute',
    visibility: 'other',
    displayOrder: 12,
    facts: { role: 'Solo', status: 'Live' },
    title: 'EmbedRoute',
    tagline: 'One embedding API, multiple providers, and a model-comparison lab.',
    description: 'An OpenAI-compatible gateway for embedding providers, with a lab to compare models using your own data.',
    longDescription: `Every RAG project had the same three files: an embedding wrapper, a provider switch and a usage logger. I extracted them into a gateway so I'd stop rewriting them, with multiple providers behind one OpenAI-compatible interface.

The gateway routes requests using your own provider keys. The Lab lets you compare embedding models on your own data, so you can explore retrieval quality before choosing an integration.`,
    tech: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Netlify'],
    highlights: [
      'OpenAI-compatible endpoint, drops into existing SDK code',
      'Bring your own provider keys for stateless routing',
      'Compare embedding models using your own data in the Lab',
      'A common interface for retrieval integrations'
    ],
    links: {
      live: 'https://www.embedroute.com',
      github: null
    },
    image: '/images/embedroute-icon.svg',
    featured: false,
    category: 'infra'
  },
  {
    id: 'azoni-mcp',
    visibility: 'merged',
    redirectTo: '/projects/azoni-ai',
    metric: { value: '1', label: 'shared tool API' },
    title: 'Azoni MCP Server',
    tagline: 'Shared tool server the agents call for data.',
    description: 'One server holding the tools my agents use, organized by domain and protected by authentication and rate limits.',
    longDescription: `Every agent I run calls this MCP server for data. It exposes activity logs, per-app health, analytics, and action execution behind one authenticated API.

Grouped by domain (fitness, gaming, content, ops), with auth and rate limits on every route. Chat and autonomous workflows hit the same endpoints, so logging is in one place. Hosted on Render, called from Netlify Functions and the Moltbook agent.`,
    tech: ['Node.js', 'Express', 'Firebase Admin', 'Render', 'REST'],
    highlights: [
      'Shared tools organized by product domain',
      'Auth and rate limits on every route',
      'One place to see what every agent has done',
      'Hosted on Render; called by my other agents'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/mcp-logo-nodes.svg',
    featured: false,
    category: 'infra',
    caseStudy: {
      role: 'Solo',
      timeline: '2024 – present',
      stack: 'Node.js · Express · Firebase Admin · Render',
      metrics: [
        { value: '1', label: 'shared API' },
      ],
      sections: [
        {
          heading: 'The problem',
          body: `Once I had several products and a few agents, each one hit Firestore and third-party APIs on its own, with auth, rate limiting, and logging copy-pasted and drifting apart. When an agent misbehaved I had no single place to see what it had done.`,
        },
        {
          heading: 'Constraints',
          body: `Chat and autonomous agents call the same tools, so the interface can't assume a human is watching. Everything is authenticated and rate-limited by default, so a buggy agent can't flood a downstream API or run up a bill without me noticing.`,
        },
        {
          heading: 'Approach and key decisions',
          body: `I put every tool behind one authenticated MCP server, grouped by domain, with logging included from the start.`,
          decisions: [
            'One server, grouped by domain (fitness, gaming, content, ops), so a new capability is just another tool rather than another service to deploy.',
            'Auth and rate limits on every route by default, because the callers are agents, not just me.',
            'Every call is logged in one place, so I can go back and see exactly what an agent did.',
            'Chat and autonomous workflows use the same endpoints, so there\'s one place that defines what an agent can do.',
          ],
        },
        {
          heading: 'Architecture',
          body: `An Express server on Render exposes the tools, and Firebase Admin holds the data and activity logs. Netlify Functions and the Moltbook agent call in over authenticated routes. Since every agent action goes through it, it's also where the cost and activity data on this site's feeds comes from.`,
        },
        {
          heading: 'Outcomes',
          body: `A shared set of tools behind one authenticated, rate-limited API that my agents call. The activity logs let me see what the agents are doing across products.`,
        },
        {
          heading: 'What I’d do differently',
          body: `I'd add per-tool schemas and typed contracts sooner. A few tools grew ad hoc and need stricter input validation.`,
        },
      ],
    }
  },
  {
    id: 'moltbook-agent',
    visibility: 'merged',
    redirectTo: '/projects/azoni-ai',
    title: 'Azoni Moltbook Agent',
    tagline: 'LangGraph agent that posts to a social network on its own.',
    description: 'LangGraph agent that posts to a social network on its own: it reads the feed, decides, drafts, checks its own draft, then posts.',
    longDescription: `Moltbook is a social network where AI agents are allowed to post. I built one of the agents.

LangGraph state machine on Render. Every few hours it reads the feed and decides whether to post, comment, or upvote. If it drafts a post, it checks the draft before publishing. It respects the platform's 30-minute cooldown, and every state transition is logged to Firestore.`,
    tech: ['Python', 'LangGraph', 'FastAPI', 'Firestore', 'OpenRouter', 'Render'],
    highlights: [
      'State machine with explicit transitions',
      'Checks its own draft before posting',
      'Respects platform cooldown and rate limits',
      'Every transition logged for replay and debugging'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/moltbook-lobster.svg',
    featured: false,
    category: 'ai'
  },
  {
    id: 'old-ways-today',
    visibility: 'featured',
    displayOrder: 3,
    facts: { years: '2025 – present', role: 'Solo', status: 'Live' },
    title: 'Old Ways Today',
    tagline: 'Wellness site about non-toxic household alternatives.',
    description: 'Wellness site about non-toxic household alternatives, with a streaming assistant grounded in a curated knowledge base, an editorial blog and product recommendations.',
    longDescription: `My first time using this agent stack for an actual product rather than my portfolio.

RAG chatbot grounded in a curated Firestore knowledge base. Editorial blog and product recommendations. FastAPI backend, Next.js frontend, EmbedRoute for vector search. Same logging and per-call cost tracking as my other apps.`,
    tech: ['Next.js', 'FastAPI', 'Firestore', 'EmbedRoute', 'Render'],
    highlights: [
      'RAG chatbot over a curated Firestore knowledge base',
      'Editorial blog and product recommendations',
      'EmbedRoute for vector search across providers',
      'Per-call cost logging shows up in the agent feed'
    ],
    links: {
      live: 'https://oldwaystoday.com',
      github: null
    },
    image: '/images/favicon-sprout.svg',
    featured: true,
    category: 'ai',
    caseStudy: {
      role: 'Solo',
      timeline: '2025 – present',
      stack: 'Next.js · FastAPI · Firestore · EmbedRoute · Render',
      metrics: [
        { value: 'Live', label: 'oldwaystoday.com' },
        { value: 'RAG', label: 'grounded answers' },
        { value: 'Streaming', label: 'chat responses' },
      ],
      sections: [
        {
          heading: 'The problem',
          body: `I wanted a household assistant that could draw on curated guides and product information. That meant connecting retrieval, conversation, and product discovery in one experience.`,
        },
        {
          heading: 'Approach and key decisions',
          body: `I grounded the assistant in a curated Firestore knowledge base and treated the model's output as untrusted until my code had checked it.`,
          decisions: [
            'Product blocks in the streamed answer are buffered and checked before they render.',
            'Any product URL the code doesn\'t recognize is swapped for a search link before it renders.',
            'Retrieval through EmbedRoute provides curated context for the assistant\'s responses.',
            'Per-call cost logging into the same agent-activity feed as my other apps.',
          ],
        },
        {
          heading: 'Constraints',
          body: `Responses stream to keep the conversation responsive. Product recommendations need usable links, so link validation is handled in code. Calls also record cost information through the shared agent stack.`,
        },
        {
          heading: 'Architecture',
          body: `A Next.js frontend talks to a FastAPI backend. Retrieval runs through EmbedRoute for vector search, with the knowledge base in Firestore. The streaming layer validates links and product references before the user sees them, so the checks live in code rather than in the prompt.`,
        },
        {
          heading: 'Outcomes',
          body: `Visitors can browse guides, explore products and ask follow-up questions. The site also has an editorial blog, a step-by-step swap guide and product discovery with affiliate links. Because validation lives in code, the link checks don't depend on the prompt behaving.`,
        },
        {
          heading: 'What I’d do differently',
          body: `I'd build an eval set for retrieval quality sooner. Right now I catch regressions by using it; a small offline eval set would catch them before deploy.`,
        },
      ],
    }
  },
  {
    id: 'bench-only',
    visibility: 'other',
    displayOrder: 11,
    facts: { role: 'Solo', status: 'Live' },
    proof: {
      asOf: PROOF_AS_OF,
      items: [
        { value: '15', label: 'users' },
        { value: '61', label: 'workouts logged' },
      ],
    },
    title: 'Bench Only',
    tagline: 'Strength training app that writes the program for you.',
    description: 'A strength training app that writes the program from your history. It is an offline-first PWA, with Netlify Functions behind Firebase auth.',
    longDescription: `I was tired of fiddling with spreadsheets between sets. I wanted an app that knew what I lifted last week and could hand me today's session.

It generates workouts from your history and recent fatigue. It's an offline-first PWA, so it works in basement gyms and syncs when you leave. Netlify Functions handle the OpenAI calls behind Firebase auth, so the API key never ships to clients, and a per-user token dashboard tracks spend per account.`,
    tech: ['React', 'Vite', 'Firebase', 'Netlify Functions', 'OpenAI', 'PWA'],
    highlights: [
      'Per-user workout generation that adapts to volume and fatigue',
      'Offline-first PWA with service-worker sync',
      'Per-user token dashboard for OpenAI spend'
    ],
    links: {
      live: 'https://benchpressonly.com',
      github: null
    },
    image: '/images/benchpressonly.svg',
    featured: false,
    category: 'ai'
  },
  {
    id: 'row-crew',
    visibility: 'featured',
    displayOrder: 4,
    facts: { role: 'Solo', status: 'Live' },
    proof: {
      asOf: PROOF_AS_OF,
      items: [
        { value: '15', label: 'rowers' },
        { value: '814 km', label: 'rowed together' },
      ],
    },
    title: 'Row Crew',
    tagline: 'Rowing tracker with photo-verified meters.',
    description: 'A rowing tracker that adds everyone\'s erg meters into a shared lap of the planet. Tesseract OCR and a Claude check verify each erg photo.',
    longDescription: `Rowing alone on a machine gets boring. Row Crew adds everyone's meters into a shared lap of the planet (40,075 km), passing real landmarks along the way.

At the end of a session users photograph their erg screen. Tesseract reads the numbers on-device, and a Claude API call checks that the photo matches the claimed meters. It's a cheap anti-cheat check.`,
    tech: ['React', 'Firebase', 'Tesseract.js', 'Claude API', 'Netlify'],
    highlights: [
      'Client-side Tesseract OCR + Claude verification',
      'Shared world-tour progress with milestone landmarks',
      'Real-time leaderboards via Firestore listeners',
      'PWA — works on mobile, syncs when online'
    ],
    links: {
      live: 'https://rowcrew.netlify.app',
      github: 'https://github.com/azoni/rowing-tracker'
    },
    image: '/images/rowing-favicon.svg',
    featured: true,
    category: 'ai',
    caseStudy: {
      sections: [
        {
          heading: 'The problem',
          body: `Rowing alone on a machine gets boring. I built Row Crew to make rowing with friends more interesting.`,
        },
        {
          heading: 'Approach and key decisions',
          body: `Row Crew adds everyone's meters into a shared lap of the planet (40,075 km), passing real landmarks along the way.`,
          decisions: [
            'At the end of a session you photograph the erg screen. Tesseract reads the numbers on-device, and a Claude API call checks that the photo matches the claimed meters. It\'s a cheap anti-cheat check.',
            'Leaderboards update in real time through Firestore listeners.',
            'It\'s a PWA, so it works on a phone at the gym and syncs when it\'s back online.',
          ],
        },
        {
          heading: 'Outcomes',
          body: `As of November 2026, 15 rowers have logged 814 km together.`,
        },
      ],
    },
  },
  {
    id: 'azoni-ai',
    visibility: 'featured',
    displayOrder: 2,
    facts: { years: '2024 – present', role: 'Solo', status: 'Live' },
    title: 'azoni.ai agent platform',
    tagline: 'The assistant, agents and shared tool API behind this site.',
    description: 'The agent platform behind azoni.ai: an assistant grounded in records I wrote or checked, a shared tool API my agents call, scheduled agents, and a Moltbook agent.',
    longDescription: `This site is itself an AI product, on the same stack as my other apps.

The assistant answers questions from a Firestore retrieval index, and questions about me are answered only from facts and records I wrote or checked. Every agent I run calls one shared tool API for data. Scribe is a daily job that turns my public GitHub commits into build notes, with a language model writing the title and a short summary for each project. Conductor runs every 3 hours and decides what to do next. Every action is logged with its model and cost.`,
    tech: ['React', 'Firebase', 'Netlify Functions', 'OpenRouter', 'EmbedRoute', 'Node.js', 'Express', 'Render', 'Python', 'LangGraph', 'FastAPI'],
    highlights: [
      'Assistant grounded in records I wrote or checked, with machine-written text filtered out',
      'Shared tool API with auth and rate limits on every route',
      'Daily Scribe job turns public commits into build notes',
      'Conductor picks the next agent action every 3 hours',
      'All cost and tokens logged in the activity feed'
    ],
    links: {
      live: 'https://azoni.ai',
      github: null,
      internal: [
        { to: '/chat', label: 'Try the assistant' },
      ],
    },
    image: '/images/azoni.png',
    featured: true,
    category: 'web',
    caseStudy: {
      role: 'Solo',
      timeline: '2024 – present',
      sections: [
        {
          heading: 'The problem',
          body: `Once I had several products and a few agents, each one hit Firestore and third-party APIs on its own, with auth, rate limiting, and logging copy-pasted and drifting apart. When an agent misbehaved I had no single place to see what it had done. And an assistant that answers questions about me can't be allowed to make things up.`,
        },
        {
          heading: 'The assistant and its grounding',
          body: `The assistant on this site answers questions about my work. It retrieves from a Firestore index, but facts about me have to come from records I wrote or checked. A filter keeps machine-written text, such as blog posts and generated notes, out of that evidence. If a fact is missing, the instructions tell it to say so instead of guessing, and it treats retrieved text as information, not instructions.`,
        },
        {
          heading: 'A shared tool API',
          icon: '/images/mcp-logo-nodes.svg',
          body: `Every agent I run calls one shared tool API for data. It's an Express server on Render that exposes activity logs, per-app health, analytics and action execution, grouped by domain (fitness, gaming, content, ops). Netlify Functions and the Moltbook agent call in over authenticated routes.`,
          decisions: [
            'One server grouped by domain, so a new capability is just another tool rather than another service to deploy.',
            'Auth and rate limits on every route by default, because the callers are agents, not just me. A buggy agent can\'t flood a downstream API or run up a bill without me noticing.',
            'Every call is logged in one place, so I can go back and see exactly what an agent did.',
            'Chat and autonomous workflows use the same endpoints, so there\'s one place that defines what an agent can do.',
          ],
        },
        {
          heading: 'The Moltbook agent',
          icon: '/images/moltbook-lobster.svg',
          body: `Moltbook is a social network where AI agents are allowed to post. I built one of the agents. It's a LangGraph state machine in Python, served with FastAPI on Render. I designed it to read the feed every few hours and decide whether to post, comment or upvote. If it drafts a post, it checks the draft before publishing. It respects the platform's 30-minute cooldown, and every state transition is logged to Firestore for replay and debugging.`,
        },
        {
          heading: 'Scheduled agents',
          body: `Scribe is a daily job that turns my public GitHub commits into build notes. A script collects the commits, a language model writes the title and a short summary for each project, and an automated check runs before anything is published. Conductor runs every 3 hours and decides which agent task to run next. Every action, from a chat reply to a build note, is logged with its model and cost.`,
        },
        {
          heading: 'Architecture',
          body: `The site is React on Netlify Functions, with Firestore for data and OpenRouter for model calls. The tool API runs on Render with Firebase Admin holding the data and activity logs. Since every agent action goes through it, it's also where the cost and activity data on this site comes from.`,
        },
        {
          heading: 'What I’d do differently',
          body: `I'd add per-tool schemas and typed contracts to the tool API sooner. A few tools grew ad hoc and need stricter input validation.`,
        },
      ],
    },
  },
  {
    id: 'launchpad',
    visibility: 'other',
    displayOrder: 14,
    // The console's own copy says each app was generated by AI from one prompt;
    // keep the link off the page until that copy matches this one.
    liveLinkHidden: true,
    // A starter template, not client-style work: no consulting close.
    closing: false,
    facts: { role: 'Solo', status: 'Live' },
    title: 'Launchpad',
    tagline: 'The template and production checklist I start small web apps from.',
    description: 'A monorepo template and the production checklist I apply to small web apps: SEO, security headers, analytics and LLM cost logging.',
    longDescription: `I kept losing app ideas to setup friction. Launchpad is a Next.js template plus a CLAUDE.md quality checklist, so every small app starts with the production basics: SEO, llms.txt, analytics, OG images, PWA icons, Firebase, Netlify, security headers and LLM cost logging.

Every app deploys independently from one monorepo and reports back to a central console, so views, errors and uptime are in one place.`,
    tech: ['Next.js', 'TypeScript', 'Firebase', 'Netlify', 'Claude Code'],
    highlights: [
      'Quality checklist: SEO, llms.txt, PWA icons, OG images, security headers, LLM cost logging',
      'Central console gallery aggregating views and errors across apps',
      'Each app deploys independently from one monorepo'
    ],
    galleryTitle: 'Apps built with the checklist',
    galleryNote: { text: 'PyroGuard also started from this template.', to: '/projects/pyroguard', label: 'Read about PyroGuard' },
    links: {
      live: 'https://launchpad-console.netlify.app',
      github: null
    },
    image: '/images/launchpad-rocket.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'meeplematch',
    visibility: 'merged',
    galleryOrder: 1,
    redirectTo: '/projects/launchpad',
    galleryLine: 'Swipe through a curated catalog of board games, and your votes drive recommendations you can buy on Amazon. It was the first app from the template and the design reference for the rest. I designed the look by hand: Comic Neue and Lilita One type, kraft-cardboard cards, candy colors and chunky offset-shadow buttons.',
    title: 'MeepleMatch',
    tagline: 'Swipe to discover your next board game.',
    description: 'Board game discovery with swipe-based voting. Swipe through curated games, get recommendations, buy on Amazon.',
    longDescription: `Tinder-style discovery for board games. Swipe through a curated catalog, and your votes drive personalized recommendations you can buy straight on Amazon.

First app shipped from the Launchpad template, and the design reference for the rest. Comic Neue and Lilita One type, kraft-cardboard cards, candy colors, chunky offset-shadow buttons. I designed the look by hand instead of using a template.`,
    tech: ['Next.js', 'Firebase', 'Amazon API', 'Tailwind'],
    highlights: [
      'Swipe-based discovery over a curated game catalog',
      'Personalized recommendations driven by your votes',
      'Amazon affiliate integration for buying',
      'Design reference for the other launchpad apps: kraft cards, candy colors'
    ],
    links: {
      live: 'https://meeplematch.netlify.app',
      github: null
    },
    image: '/images/launchpad/meeplematch.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'blackdiamond',
    visibility: 'unlisted',
    // The linked demo presents itself as a real local business; keep the link
    // off the page until it's labeled (see the site audit).
    liveLinkHidden: true,
    title: 'Black Diamond Alpine Wash',
    tagline: 'Exterior cleaning company site with quote flow.',
    description: 'Exterior cleaning company site with service pages, quote request form, and local SEO.',
    longDescription: `Small-business site for an exterior cleaning company — service pages, a quote request form backed by Firebase, and local SEO so it shows up for nearby searches.

The plainest app in the set. I built it to show the template handles an ordinary services business just as well as an AI app.`,
    tech: ['Next.js', 'Firebase', 'Tailwind'],
    highlights: [
      'Service pages and a quote request flow',
      'Local SEO: metadata, JSON-LD, and sitemap',
      'Firebase-backed quote submissions',
      'Shows the template can handle client work'
    ],
    links: {
      live: 'https://blackdiamond-alpine-wash.netlify.app',
      github: null
    },
    image: '/images/launchpad/blackdiamond.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'benchmark',
    visibility: 'merged',
    galleryOrder: 2,
    redirectTo: '/projects/launchpad',
    galleryLine: 'A joke app. Tell it anything you\'ve done (ran a marathon, shipped a startup, survived a group project) and Claude converts it into pounds on the bench. The result cards are made to screenshot and share, every LLM call is cost-logged like my other apps, and the API key stays server-side in Netlify Functions.',
    title: 'Benchmark',
    tagline: 'Turn any achievement into a bench press max.',
    description: 'A shareable joke app that translates any achievement into a bench-press max, using Claude.',
    longDescription: `Tell it anything you've done (ran a marathon, shipped a startup, survived a group project) and Claude converts it into pounds on the bench. It's a joke app.

The result cards are made to screenshot and share. Every LLM call is cost-logged to the portfolio's activity feed, like my other apps.`,
    tech: ['React', 'Vite', 'Claude API', 'Netlify Functions'],
    highlights: [
      'Claude translates any achievement into a bench max',
      'Screenshot-ready, shareable result cards',
      'API key stays server-side via Netlify Functions',
      'Per-call cost logging into the portfolio activity feed'
    ],
    links: {
      live: 'https://benchmark-app-azoni.netlify.app',
      github: null
    },
    image: '/images/launchpad/benchmark.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'repmatch',
    visibility: 'merged',
    galleryOrder: 3,
    redirectTo: '/projects/launchpad',
    galleryLine: 'Lifting with friends who are stronger or weaker than you stops being fun when the loads aren\'t comparable. Everyone enters their max, the app rolls a rep count, and each lifter gets a weight that\'s equally hard for them. I built it in an afternoon. It\'s one screen and a formula.',
    title: 'RepMatch',
    tagline: 'Workout rep-equivalence calculator for friends.',
    description: 'Input your max, roll a random rep count, and compete with friends at equal effort.',
    longDescription: `Lifting with friends who are stronger or weaker than you stops being fun when the loads aren't comparable. RepMatch normalizes effort: everyone enters their max, the app rolls a rep count, and each lifter gets a weight that's equally hard for them.

Built from the Launchpad template in an afternoon. It's one screen and a formula.`,
    tech: ['React', 'Vite', 'Tailwind'],
    highlights: [
      'Normalizes effort across different strength levels',
      'Roll a rep count, get everyone\'s equivalent weight',
      'Built for competing with friends at equal difficulty'
    ],
    links: {
      live: 'https://repmatch-app.netlify.app',
      github: null
    },
    image: '/images/launchpad/repmatch.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'crypto-tax-2025',
    visibility: 'unlisted',
    title: 'Crypto Tax 2025',
    tagline: 'Wallet-first crypto tax reconstruction with a local guest mode.',
    description: 'A personal crypto transaction tool with wallet imports, FIFO calculations, a review queue, and exports formatted for TurboTax.',
    longDescription: `I built it to reconstruct a year of my crypto activity for taxes without handing it to a service I couldn't audit. Wallet-first imports, deterministic FIFO cost-basis math, and a review queue for the transactions that need a human call.

Exports are formatted for TurboTax. I built it for my own filing, with restricted sign-in and a guest mode that lets visitors explore the pipeline using data stored in their browser.`,
    tech: ['React', 'Vite', 'Firebase', 'Claude API'],
    highlights: [
      'Wallet-first transaction imports',
      'Deterministic FIFO cost-basis engine',
      'Exports formatted for TurboTax',
      'Restricted sign-in plus a local guest mode with no account required'
    ],
    links: {
      live: 'https://crypto-tax-2025.netlify.app',
      github: null
    },
    image: '/images/launchpad/crypto-tax-2025.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'pyroguard',
    visibility: 'other',
    displayOrder: 15,
    facts: { status: 'v2 rebuild in progress' },
    title: 'PyroGuard',
    tagline: 'Ops platform for fire & life-safety inspection contractors.',
    description: 'An operations platform for fire and life-safety inspection contractors. The first version is a playable demo, and I\'m rebuilding it from the ground up as v2.',
    longDescription: `An operations platform for fire and life-safety inspection contractors. I'm rebuilding it from the ground up as v2.

The first version is a playable demo. "A Day in the Field" walks through one NFPA 25 inspection from the riser to the invoice, including offline photo capture in a cellular dead zone.`,
    tech: ['Next.js', 'TypeScript', 'Tailwind'],
    highlights: [
      'Playable demo: one real NFPA 25 inspection, riser to invoice',
      'Offline photo capture in a cellular dead zone',
      'v2 is a ground-up rebuild that keeps the demo\'s design shell',
      'Tactical ops-console design language'
    ],
    links: {
      live: 'https://pyroguard-demo.netlify.app',
      github: null
    },
    image: '/images/launchpad/pyroguard.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'dayrun',
    visibility: 'unlisted',
    // The linked app's public demo and profile need fixing first (see the site audit).
    liveLinkHidden: true,
    title: 'Daily',
    tagline: 'An opt-in calendar and interview pipeline.',
    description: 'Sign in with Google, sync your Calendar, track interviews and opportunities, and toggle what the world sees on your public profile.',
    longDescription: `An opt-in calendar. Sign in with Google, sync your real Calendar, and choose exactly which events the world can see on your public /u/username profile.

Underneath it is an interview-and-opportunity pipeline: applications, follow-ups, and scheduling tracked in one place instead of a spreadsheet.`,
    tech: ['Next.js', 'Firebase', 'Google Calendar API', 'Claude API'],
    highlights: [
      'Google sign-in with real Calendar sync',
      'Public /u/username profile with per-event visibility',
      'Interview and opportunity pipeline tracking',
      'Nothing is public unless you toggle it on'
    ],
    links: {
      live: 'https://dayrun-app.netlify.app',
      github: null
    },
    image: '/images/launchpad/dayrun.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'macromarket',
    visibility: 'merged',
    galleryOrder: 4,
    redirectTo: '/projects/launchpad',
    galleryLine: 'People track protein closely but rarely compare what it costs. MacroMarket ranks foods, snacks and supplements by dollars per gram of protein, with a protein-goal calculator, a deals tab, a Claude-powered coach that recommends the cheapest picks for your target, and Amazon affiliate links.',
    title: 'MacroMarket',
    tagline: 'Foods ranked by cost per gram of protein.',
    description: 'Ranks foods, snacks, and supplements by dollars per gram of protein, with a goal calculator, deals tab, and AI protein coach.',
    longDescription: `People track protein intake closely but rarely compare what it costs. MacroMarket ranks foods, snacks, and supplements by dollars per gram of protein so you can hit your number without overpaying.

Includes a protein-goal calculator, a deals tab, and a Claude-powered coach that recommends the cheapest picks for your target. Amazon affiliate links for buying.`,
    tech: ['Next.js', 'Firebase', 'Claude API', 'Amazon Affiliate'],
    highlights: [
      'Every item ranked by dollars per gram of protein',
      'Protein-goal calculator plus a deals tab',
      'Claude-powered coach recommends the cheapest picks',
      'Amazon affiliate integration'
    ],
    links: {
      live: 'https://macromarket-app.netlify.app',
      github: null
    },
    image: '/images/launchpad/macromarket.svg',
    featured: false,
    category: 'launchpad'
  },
  {
    id: 'fab-stats-bot',
    visibility: 'merged',
    redirectTo: '/projects/fab-stats',
    metric: { value: '24', label: 'slash commands' },
    title: 'FaB Stats Discord Bot',
    tagline: 'Companion Discord bot for FaB Stats.',
    description: 'TypeScript Discord bot with 24 slash commands for Flesh and Blood community servers.',
    longDescription: `Companion bot for FaB Stats. Slash commands answer hero stats, matchup queries, and leaderboards directly in Discord without leaving the channel.

Background scheduler heartbeats every minute, autocomplete handlers reduce search friction, and per-command analytics show me which queries get used.`,
    tech: ['TypeScript', 'Discord.js', 'Firebase Admin', 'Node.js'],
    highlights: [
      '24 slash commands across hero stats, matchups, and leaderboards',
      'Autocomplete on every searchable parameter',
      'Heartbeat + per-command analytics',
      'Used in Flesh and Blood community servers'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/bots.png',
    featured: false,
    category: 'games'
  },
  {
    id: 'tcgdoku',
    visibility: 'other',
    displayOrder: 16,
    // No page of its own any more: the card links to the live puzzle.
    redirectTo: '/projects',
    title: 'TCGDoku',
    tagline: 'A daily card-game puzzle with the same seed for everyone. It has a custom puzzle builder, shareable links, per-player streaks and stats, and card validation against Scryfall.',
    description: 'A daily trading card game puzzle. Everyone gets the same seeded puzzle, and results are shareable.',
    longDescription: `A daily puzzle for trading card games. Every player gets the same seeded puzzle so results are comparable, plus a custom puzzle builder for sharing your own.

Card validation hits the Scryfall API on submit. Streaks and shares persist in Firebase.`,
    tech: ['React', 'Firebase', 'Scryfall API', 'Netlify'],
    highlights: [
      'Seeded daily puzzle, same answer worldwide',
      'Custom puzzle builder and shareable links',
      'Live card validation against Scryfall',
      'Streaks and stats per player'
    ],
    links: {
      live: 'https://tcgdoku.netlify.app',
      github: null
    },
    image: '/images/tcgdoku.svg',
    featured: false,
    category: 'games'
  },
  {
    id: 'spell-brigade',
    visibility: 'other',
    // A hobby game: no consulting close on its page.
    closing: false,
    displayOrder: 13,
    facts: { role: 'Solo' },
    metric: { value: '6', label: 'zones · 3 classes' },
    title: 'Spell Brigade',
    tagline: 'Real-time multiplayer wizard game with AI-generated characters.',
    description: 'Real-time multiplayer wizard game with AI-generated characters, running on a server-authoritative Socket.IO loop.',
    longDescription: `A real-time multiplayer game. Wizards co-op through procedural dungeons over Socket.IO. Three classes (Pyromancer, Cryomancer, Arcanist) and six zones from Sanctuary to the Abyss.

It started as a single Node.js file. Once it got too big to read, I split the server into separate modules: auth, room manager, combat tick, persistence, AI generation. Fixing bugs got a lot easier after that.`,
    tech: ['React', 'Node.js', 'Socket.IO', 'Express', 'Firebase Admin'],
    highlights: [
      'Server-authoritative Socket.IO game loop',
      'Split the single-file server into modules with no downtime',
      'GPT-4o-mini character generator with balancing constraints',
      'Six progression zones, three classes, persistent ranks'
    ],
    links: {
      live: 'https://azoni.ai/game',
      github: null,
      internal: [{ to: '/game', label: 'Play the game' }],
    },
    image: '/images/spell-brigade-hero.svg',
    featured: false,
    category: 'games'
  },
  {
    id: 'polymarket-tool',
    visibility: 'unlisted',
    archived: true,
    metric: { value: '3', label: 'strategy modules' },
    title: 'Polymarket Edge Finder',
    tagline: 'Edge-finder for prediction markets.',
    description: 'Edge-finder for Polymarket. FastAPI backend ingests markets, React frontend explores spreads.',
    longDescription: `Pulls live Polymarket data, runs it through a few strategy modules (spread inefficiency, volume anomaly, directional momentum), and surfaces candidate edges.

It's a research tool. The frontend is for exploring markets; the backend is what an auto-trader would use if I built one.`,
    tech: ['FastAPI', 'Python', 'React', 'Vite', 'Recharts'],
    highlights: [
      'Live Polymarket ingestion pipeline',
      'Spread, volume, and momentum strategy modules',
      'Interactive frontend for scenario exploration',
      'Built for hypothesis-forming and market exploration'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/polymarket.svg',
    featured: false,
    category: 'fintech'
  },
  {
    id: 'image-pipeline-api',
    visibility: 'unlisted',
    archived: true,
    title: 'Image Pipeline API',
    tagline: 'FastAPI image worker with job queues and observability.',
    description: 'FastAPI image worker. Job queues, request tracing, agent lifecycles, dashboard endpoint.',
    longDescription: `Backend for handling image uploads, transformations, and async jobs without a queue service. SQLAlchemy-backed job tracking, Pydantic schemas, Pillow for the actual work.

Every request gets a trace ID and a duration metric. Background workers spin up and down with the FastAPI lifespan so a redeploy doesn't strand jobs. A small dashboard endpoint exposes queue depth, error rate, and recent traces.`,
    tech: ['FastAPI', 'SQLAlchemy', 'Pydantic', 'Pillow', 'Pytest'],
    highlights: [
      'Async job queue with SQLAlchemy persistence',
      'Trace IDs + duration metrics on every request',
      'Worker lifecycle managed via FastAPI lifespan',
      'Dashboard endpoint for queue depth + error rate'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/admin-panel.png',
    featured: false,
    category: 'infra'
  },
  {
    id: 'scryfall-ai',
    visibility: 'unlisted',
    archived: true,
    title: 'Scryfall AI',
    tagline: 'Natural-language card search over Scryfall.',
    description: 'Plain-English requests turned into Scryfall query syntax. Ask for "blue counter spells under 3 mana", get the search string.',
    longDescription: `Scryfall's query language is powerful but unfriendly. Scryfall AI lets you ask for cards in plain English and turns the request into a working Scryfall query.

The output is plain Scryfall syntax. Drop the result into Scryfall's URL bar and it works.`,
    tech: ['Node.js', 'Express', 'Scryfall API'],
    highlights: [
      'Plain English to Scryfall query syntax',
      'Simple API; drop straight into a search URL',
      'For people who don\'t know Scryfall\'s syntax'
    ],
    links: {
      live: 'https://scryfall.netlify.app',
      github: null
    },
    image: '/images/scryfall.png',
    featured: false,
    category: 'ai'
  },
  {
    id: 'dustbunny',
    visibility: 'earlier',
    displayOrder: 21,
    archived: true,
    facts: { years: 'Sep 2021 – Jun 2022', status: 'Shut down' },
    metric: { value: '2,500/min', label: 'requests, sustained 6mo' },
    // A compressed copy of /images/dustbunny.png, which stays in the repo.
    photo: { src: '/images/dustbunny-photo.jpg', alt: 'A room of laptops from the Dustbunny years.', width: 689, height: 919 },
    title: 'Dustbunny',
    tagline: 'A distributed NFT bidding bot I ran from September 2021 to June 2022.',
    description: 'Distributed NFT bidding bot. 50 Dockerized workers with Redis coordination, sustaining about 2,500 requests per minute.',
    longDescription: `A bidding bot competing against every other floor sniper on OpenSea. Distributed across 50 Dockerized workers with Redis-backed coordination so they didn't trip over each other.

It held around 2,500 req/min for six months. I adapted the strategy daily; when other bots changed their patterns, mine had to change too to stay profitable. Eventually the marketplace cooled and I shut it down.`,
    tech: ['Node.js', 'Redis', 'Docker', 'OpenSea SDK', 'Web3'],
    highlights: [
      '50 Dockerized workers + Redis coordination',
      '~2,500 req/min sustained for 6 months',
      'Daily strategy adaptation in a bot arms race',
      'Operational kill-switches for runaway bid scenarios'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/dustbunny-icon.png',
    featured: false,
    category: 'web3'
  },
  {
    id: 'oli-fitness',
    visibility: 'earlier',
    displayOrder: 22,
    archived: true,
    facts: { years: 'Jan 2016 – Mar 2018', role: 'Co-founder & technical lead' },
    metric: { value: 'CHI 2017', label: 'ACM published' },
    title: 'OLI Fitness',
    tagline: 'A Kinect-based weightlifting form analyzer I co-founded in college.',
    description: 'Real-time weightlifting form analyzer using Kinect: 25 joints at 30fps, scored against expert references.',
    longDescription: `I co-founded OLI Fitness in college. We built a Kinect body tracker that scored lifting form against expert reference movements in real time, at 25 joints and 30 frames per second.

I led a team of five to an ACM CHI 2017 extended abstract and several startup competitions, including a Princeton Tiger Launch finals spot. It was my first time taking a product from nothing to a demo people could try.`,
    tech: ['C#', 'Kinect SDK', 'Computer Vision', 'Unity'],
    highlights: [
      '25-joint body tracking at 30fps with reference scoring',
      'ACM CHI 2017 extended abstract',
      'Princeton Tiger Launch finalist',
      'Led a team of 5; my first time building a product from scratch'
    ],
    links: {
      live: null,
      github: null,
      paper: 'https://dl.acm.org/doi/abs/10.1145/3027063.3048429'
    },
    image: '/images/oli.png',
    featured: false,
    category: 'ai'
  },
  {
    id: 'hashmaps',
    visibility: 'earlier',
    displayOrder: 23,
    archived: true,
    metric: { value: '1st', label: 'hackathon win' },
    title: 'HashMaps',
    tagline: 'A hashtag generator from photos and location. 1st place at the T-Mobile Big Data Hackathon.',
    description: 'Contextual hashtag generator combining image analysis with location data. Built in a weekend, won 1st place.',
    longDescription: `Built in 36 hours for the T-Mobile Big Data Hackathon. Take a photo, extract objects and scenes via OpenCV, fuse with the device location, return context-aware hashtags ready to paste.

Won 1st place for combining vision, location, and time context. One of the first things I built and shipped start to finish under a deadline.`,
    tech: ['Python', 'OpenCV', 'Geolocation API'],
    highlights: [
      '1st place at T-Mobile Big Data Hackathon',
      'Vision + geolocation + temporal context fusion',
      'Built and presented in 36 hours'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/hashmaps-icon.png',
    featured: false,
    category: 'ai'
  }
];

export const categories = {
  all: 'All Projects',
  ai: 'AI and ML',
  infra: 'Platforms and Infra',
  launchpad: 'Launchpad',
  fintech: 'Fintech',
  web3: 'Web3',
  games: 'Games',
  web: 'Web Apps'
};

export const VISIBILITIES = ['featured', 'other', 'earlier', 'unlisted', 'merged'];
// Only these show up on /projects and in prev/next links.
export const LISTED_VISIBILITIES = ['featured', 'other', 'earlier'];

const byOrder = (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
export const getWorkGroups = (list = projects) => ({
  featured: list.filter((p) => p.visibility === 'featured').sort(byOrder),
  other: list.filter((p) => p.visibility === 'other').sort(byOrder),
  earlier: list.filter((p) => p.visibility === 'earlier').sort(byOrder),
});
// Projects whose content was folded into another project's page.
// Gallery order is set here, so it doesn't depend on how the list was sorted.
export const getMergedInto = (id, list = projects) =>
  list.filter((p) => p.visibility === 'merged' && p.redirectTo === `/projects/${id}`)
    .sort((a, b) => (a.galleryOrder ?? 999) - (b.galleryOrder ?? 999));

// '3,898 players · 1,634,956 matches tracked, as of November 2026'
export const proofLine = (proof) => (proof?.items?.length
  ? `${proof.items.map((item) => `${item.value} ${item.label}`).join(' · ')}, as of ${proof.asOf}`
  : null);

export const getFeaturedProjects = () => projects.filter((p) => p.featured);
export const getProjectById = (id) => projects.find((p) => p.id === id);
export const getProjectsByCategory = (category) =>
  category === 'all' ? projects : projects.filter((p) => p.category === category);
