export const projects = [
  {
    id: 'fab-stats',
    metric: { value: '2,900+', label: 'players' },
    title: 'FaB Stats',
    tagline: 'Stats site and Discord bot for the Flesh and Blood TCG.',
    description: 'Stats platform for competitive Flesh and Blood. 2,900+ players and 1.2M+ matches tracked, with match logging, hero performance, matchup win rates, leaderboards, and daily minigames.',
    longDescription: `I built FaB Stats because the Flesh and Blood community argued about the meta with no shared data.

Players log matches, browse hero-level performance, compare matchup win rates, and climb leaderboards. There's a Chrome extension that imports a tournament bracket in one click, a Discord bot in 20+ servers, and a rotating set of daily puzzle minigames (FaBdoku, Bladedash, Brutebrawl) that people play in the morning.`,
    tech: ['Next.js', 'React', 'TypeScript', 'Firebase', 'Netlify Functions', 'Satori'],
    highlights: [
      'Chrome extension imports a whole tournament in one click',
      'Companion Discord bot — 24 slash commands, live in 20+ servers',
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
    displayOrder: 1,
    caseStudy: {
      role: 'Solo — design, build, and operate',
      timeline: '2023 – present',
      stack: 'Next.js · Firestore · Netlify Functions · Chrome extension',
      metrics: [
        { value: '2,900+', label: 'registered players' },
        { value: '1.2M+', label: 'matches tracked' },
        { value: '20+', label: 'Discord servers' },
      ],
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
          heading: 'Outcomes',
          body: `2,900+ registered players, 1.2M+ matches, and the bot in 20+ servers. People now cite it in meta arguments instead of going on feel.`,
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
    metric: { value: '4', label: 'providers, one key' },
    title: 'EmbedRoute',
    tagline: 'Embedding API gateway with one key for four providers.',
    description: 'Embedding API gateway. One key for four providers, with a drop-in OpenAI-compatible endpoint.',
    longDescription: `Every RAG project I built repeated the same embedding wrapper, provider switch, and usage logger. I pulled them out into EmbedRoute so I'd stop rewriting them.

The endpoint is OpenAI-compatible, so it drops into existing SDK code. It routes to OpenAI, Voyage, Cohere, or Mistral, caches duplicate requests, logs cost per call, and scopes usage per API key. Switching models is a config change instead of a redeploy.`,
    tech: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Netlify'],
    highlights: [
      'OpenAI-compatible endpoint, drops into existing SDK code',
      'Supabase auth with per-key usage scoping and a PostgreSQL request log',
      'Provider routing with dedup caching to reduce cost',
      'Powers the azoni.ai chatbot and Old Ways Today'
    ],
    links: {
      live: 'https://www.embedroute.com',
      github: null
    },
    image: '/images/embedroute-icon.svg',
    featured: true,
    category: 'infra'
  },
  {
    id: 'azoni-mcp',
    metric: { value: '37', label: 'tools across 9 domains' },
    title: 'Azoni MCP Server',
    tagline: 'Shared tool server the agents call for data.',
    description: 'One server holding the tools my agents use: 37 tools across 9 domains, behind auth and rate limits.',
    longDescription: `Every agent I run calls this MCP server for data. It exposes activity logs, per-app health, analytics, and action execution behind one authenticated API.

Grouped by domain (fitness, gaming, content, ops), with auth and rate limits on every route. Chat and autonomous workflows hit the same endpoints, so logging is in one place. Hosted on Render, called from Netlify Functions and the Moltbook agent.`,
    tech: ['Node.js', 'Express', 'Firebase Admin', 'Render', 'REST'],
    highlights: [
      '37 tools across 9 domains',
      'Auth and rate limits on every route',
      'One place to see what every agent has done',
      'Hosted on Render; called by my other agents'
    ],
    links: {
      live: null,
      github: null
    },
    image: '/images/mcp-logo-nodes.svg',
    featured: true,
    category: 'infra',
    caseStudy: {
      role: 'Solo',
      timeline: '2024 – present',
      stack: 'Node.js · Express · Firebase Admin · Render',
      metrics: [
        { value: '37', label: 'tools' },
        { value: '9', label: 'domains' },
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
          body: `37 tools across 9 domains behind one authenticated, rate-limited API that all my agents call. It's internal infrastructure rather than a public app, and the logging is how I know what the agents are doing.`,
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
    featured: true,
    category: 'ai'
  },
  {
    id: 'old-ways-today',
    title: 'Old Ways Today',
    tagline: 'Wellness site about non-toxic household alternatives.',
    description: 'Wellness site about non-toxic household alternatives. RAG chatbot, editorial blog, and product recommendations.',
    longDescription: `My first time using this agent stack for an actual product rather than my portfolio.

RAG chatbot grounded in a curated Firestore knowledge base. Editorial blog and product recommendations. FastAPI backend, Next.js frontend, EmbedRoute for vector search. Same logging and per-call cost tracking as my other apps.`,
    tech: ['Next.js', 'FastAPI', 'Firestore', 'PostgreSQL', 'EmbedRoute', 'Render'],
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
          body: `This was the first time I pointed my agent stack at an actual product instead of my portfolio. I wanted an assistant that answers household questions from a curated knowledge base instead of making things up the way a raw LLM does.`,
        },
        {
          heading: 'Constraints',
          body: `A consumer chatbot has to feel fast, so responses stream. It also can't invent facts or dead links. A 404, or worse a wrong-product link, sends users somewhere useless. And because it runs on the same shared stack as everything else, every call is cost-logged.`,
        },
        {
          heading: 'Approach and key decisions',
          body: `I grounded the assistant in a curated Firestore knowledge base and treated the model's output as untrusted until I'd checked it.`,
          decisions: [
            'Retrieval over a curated knowledge base through EmbedRoute, so answers come from that content, not the model\'s memory.',
            'Streaming responses buffer product blocks until they\'re validated, so a half-formed recommendation never shows up in the UI.',
            'Every product link is checked. A hallucinated affiliate URL that would 404 gets swapped for a search link before the user sees it.',
            'Per-call cost logging into the same agent-activity feed as my other apps.',
          ],
        },
        {
          heading: 'Architecture',
          body: `A Next.js frontend talks to a FastAPI backend. Retrieval runs through EmbedRoute for vector search, with the knowledge base in Firestore. The streaming layer validates links and product references before the user sees them, so the checks live in code rather than in the prompt.`,
        },
        {
          heading: 'Outcomes',
          body: `It answers from curated content, streams, and falls back to a safe link when the model invents one. The link check in particular turned a recurring hallucination into a non-issue.`,
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
    title: 'Bench Only',
    tagline: 'Strength training app that writes the program for you.',
    description: 'Strength training app that writes the program. Offline-first PWA, Netlify Functions behind Firebase auth.',
    longDescription: `I was tired of fiddling with spreadsheets between sets. I wanted an app that knew what I lifted last week and could hand me today's session.

It generates workouts from your history and recent fatigue. It's an offline-first PWA, so it works in basement gyms and syncs when you leave. Netlify Functions handle the OpenAI calls behind Firebase auth, so the API key never ships to clients, and a per-user token dashboard tracks spend per account.`,
    tech: ['React', 'Vite', 'Firebase', 'Netlify Functions', 'OpenAI', 'PWA'],
    highlights: [
      'Per-user workout generation that adapts to volume and fatigue',
      'Offline-first PWA with service-worker sync',
      'API key stays server-side via Netlify Functions',
      'Per-user token dashboard for OpenAI spend'
    ],
    links: {
      live: 'https://benchpressonly.com',
      github: null
    },
    image: '/images/benchpressonly.svg',
    featured: true,
    category: 'ai'
  },
  {
    id: 'row-crew',
    title: 'Row Crew',
    tagline: 'Rowing tracker with photo-verified meters.',
    description: 'Rowing tracker that turns ergs into a team. Tesseract OCR + Claude verification of erg photos.',
    longDescription: `Rowing alone on a machine gets boring. RowCrew adds everyone's meters into a shared lap of the planet (40,075 km), passing real landmarks along the way.

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
    category: 'ai'
  },
  {
    id: 'azoni-ai',
    title: 'azoni.ai',
    tagline: 'This site. Chatbot, agents, and the stack underneath.',
    description: 'This site. Chatbot answering questions, agents writing the blog, activity feed running live.',
    longDescription: `This site is itself an AI product, on the same stack as my other apps.

Scribe writes a blog post every weekday from my GitHub commits. Conductor runs every 3 hours and decides what to do next. Azoni AI answers questions over a Firestore RAG index that adds new content when retrieval scores drop. Every action (chat reply, blog post, knowledge generation) is logged with its model and cost.`,
    tech: ['React', 'Firebase', 'Netlify Functions', 'OpenRouter', 'EmbedRoute'],
    highlights: [
      'Live RAG chatbot with on-the-fly knowledge generation',
      'Daily Scribe cron writes blog posts from commits',
      'Conductor cron picks the next agent action every 3h',
      'All cost + tokens logged in the activity feed'
    ],
    links: {
      live: 'https://azoni.ai',
      github: null
    },
    image: '/images/azoni.png',
    featured: true,
    category: 'web'
  },
  {
    id: 'launchpad',
    title: 'Launchpad',
    tagline: 'Monorepo and checklist for shipping small web apps fast.',
    description: 'A monorepo and quality checklist that turns one prompt into a deployed app. 8 shipped so far.',
    longDescription: `I kept losing app ideas to setup friction. Launchpad is a Next.js template plus a CLAUDE.md quality checklist (SEO, llms.txt, analytics, OG images, PWA icons, Firebase, Netlify, security headers) that takes one prompt from idea to deployed app.

Every app deploys independently from one monorepo and reports back to a central console: views, errors, and uptime in one place. Eight apps shipped from the template so far, and each one beacons traffic into the site leaderboard.`,
    tech: ['Next.js', 'TypeScript', 'Firebase', 'Netlify', 'Claude Code'],
    highlights: [
      'One prompt from idea to a deployed, SEO-complete app',
      'Quality checklist: SEO, llms.txt, PWA icons, OG images, security headers, LLM cost logging',
      'Central console gallery aggregating views and errors across apps',
      '8 apps shipped: MeepleMatch, PyroGuard, MacroMarket, Daily, and more'
    ],
    links: {
      live: 'https://launchpad-console.netlify.app',
      github: null
    },
    image: '/images/launchpad-rocket.svg',
    featured: true,
    category: 'launchpad'
  },
  {
    id: 'meeplematch',
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
    title: 'Crypto Tax 2025',
    tagline: 'Wallet-first crypto tax reconstruction. Single-user, auth-gated.',
    description: 'Personal 2025 crypto tax reconstruction. Wallet-first imports, deterministic FIFO, audit-ready exports for TurboTax.',
    longDescription: `I built it to reconstruct a year of my crypto activity for taxes without handing it to a service I couldn't audit. Wallet-first imports, deterministic FIFO cost-basis math, and a review queue for the transactions that need a human call.

Exports are audit-ready and formatted for TurboTax. It's single-user and auth-gated. I built it for my own filing, though the pipeline would work for others.`,
    tech: ['React', 'Vite', 'Firebase', 'Claude API'],
    highlights: [
      'Wallet-first transaction imports',
      'Deterministic FIFO cost-basis engine',
      'Audit-ready, TurboTax-friendly exports',
      'Single-user and auth-gated, built for my own filing'
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
    title: 'PyroGuard',
    tagline: 'Ops platform for fire & life-safety inspection contractors.',
    description: 'Operations platform for fire and life-safety inspection contractors, meant to replace SedonaOffice, the legacy system most of the industry still runs on.',
    longDescription: `Operations platform for fire and life-safety inspection contractors, meant to replace SedonaOffice, the legacy system most of the industry still runs on.

The demo is playable. "A Day in the Field" walks through one NFPA 25 inspection from the riser to the invoice, including offline photo capture in a cellular dead zone.`,
    tech: ['Next.js', 'TypeScript', 'Tailwind'],
    highlights: [
      'Playable demo: one real NFPA 25 inspection, riser to invoice',
      'Offline photo capture in a cellular dead zone',
      'SedonaOffice replacement, rebuilt from the ground up',
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
    metric: { value: '24', label: 'slash commands' },
    title: 'FaB Stats Discord Bot',
    tagline: 'Companion bot for FaB Stats. Lives in 20+ servers.',
    description: 'TypeScript Discord bot with 24 slash commands. Lives in 20+ FaB community servers.',
    longDescription: `Companion bot for FaB Stats. Slash commands answer hero stats, matchup queries, and leaderboards directly in Discord without leaving the channel.

Background scheduler heartbeats every minute, autocomplete handlers reduce search friction, and per-command analytics show me which queries get used.`,
    tech: ['TypeScript', 'Discord.js', 'Firebase Admin', 'Node.js'],
    highlights: [
      '24 slash commands across hero stats, matchups, and leaderboards',
      'Autocomplete on every searchable parameter',
      'Heartbeat + per-command analytics',
      'Lives in 20+ community servers'
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
    title: 'TCGDoku',
    tagline: 'Daily TCG puzzle. Wordle for card games.',
    description: 'Daily TCG puzzle. Same seed for everyone, share results.',
    longDescription: `Wordle for trading card games. Same seeded daily puzzle for every player so results are comparable, plus a custom puzzle builder for sharing your own.

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
    featured: true,
    category: 'games'
  },
  {
    id: 'spell-brigade',
    metric: { value: '6', label: 'zones · 3 classes' },
    title: 'Spell Brigade',
    tagline: 'Real-time multiplayer wizard game with AI-generated characters.',
    description: 'Real-time multiplayer wizard game with AI-generated characters. Server-authoritative Socket.IO loop.',
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
      github: null
    },
    image: '/images/spell-brigade-hero.svg',
    featured: true,
    category: 'games'
  },
  {
    id: 'polymarket-tool',
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
    archived: true,
    title: 'Scryfall AI',
    tagline: 'Natural-language card search over Scryfall.',
    description: 'Plain-English to Scryfall query syntax. Ask for "blue counter spells under 3 mana", get the search string.',
    longDescription: `Scryfall's query language is powerful but unfriendly. Scryfall AI wraps an LLM around it so you can ask in plain English and get a working query.

The prompt forces structured Scryfall syntax with no chatter. Drop the result into Scryfall's URL bar and it works.`,
    tech: ['Node.js', 'Express', 'OpenAI API', 'Scryfall API'],
    highlights: [
      'Plain English to Scryfall query syntax',
      'Constrained output prompt, no LLM chatter',
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
    archived: true,
    metric: { value: '2,500/min', label: 'bids, sustained 6mo' },
    title: 'Dustbunny',
    tagline: '50 Dockerized bots, 2,500 req/min, 24/7 uptime.',
    description: 'Distributed NFT bidding bot. 50 Dockerized workers, Redis coordination, ~2,500 req/min, 24/7 uptime.',
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
    image: '/images/dustbunny.png',
    featured: false,
    category: 'web3'
  },
  {
    id: 'oli-fitness',
    archived: true,
    metric: { value: 'CHI 2017', label: 'ACM published' },
    title: 'OLI Fitness',
    tagline: 'Co-founded a Kinect-based form analyzer. ACM CHI 2017.',
    description: 'Real-time weightlifting form analyzer using Kinect: 25 joints at 30fps, scored against expert references.',
    longDescription: `Co-founded OLI Fitness in college. A Kinect-based body tracker that scored your lifting form against expert reference movements in real time, at 25 joints and 30 frames per second.

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
    archived: true,
    metric: { value: '1st', label: 'hackathon win' },
    title: 'HashMaps',
    tagline: 'OpenCV + geolocation hashtag generator. 1st place, T-Mobile Big Data Hackathon.',
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
    image: '/images/hashmaps.png',
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

export const getFeaturedProjects = () => projects.filter((p) => p.featured);
export const getProjectById = (id) => projects.find((p) => p.id === id);
export const getProjectsByCategory = (category) =>
  category === 'all' ? projects : projects.filter((p) => p.category === category);
