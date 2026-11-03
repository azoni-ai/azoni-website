export const projectEmailHref = 'mailto:charlton@azoni.ai';
// Flip to true once a real test booking on /meet works; every booking button follows it.
export const meetLive = false;
export const bookingCta = meetLive ? { to: '/meet', label: 'Book a call' } : { to: '/contact', label: 'Get in touch' };
export const resumePath = '/resume';
export const consulting = {
  name: 'Azoni',
  role: 'Principal software engineer',
  email: 'charlton@azoni.ai',
  description: 'Software and AI consulting by Charlton Smith through Azoni LLC: AI and workflow automation, software for your business, and hands-on engineering help.',
  projectEmailHref,
};
// Each service cites real work, labeled as my own product or earlier employment.
export const services = [
  { id: 'applied-ai', number: '01', title: 'AI & workflow automation',
    summary: 'Save time on repetitive work. Connect your tools and put AI to work where it helps.',
    description: 'Find the manual steps slowing your business down, connect the systems you already use, and build automation your team can rely on.',
    work: ['AI assistants and knowledge search', 'Connected tools and automated business workflows', 'Agent workflows and tool integrations', 'Evaluation, observability, and cost controls'],
    fit: 'Your team spends too much time on manual work, or you want to explore a useful application of AI.',
    example: '/projects/old-ways-today', exampleLabel: 'Explore Old Ways Today',
    proof: [
      { name: 'Old Ways Today', kind: 'My own product', to: '/projects/old-ways-today', linkLabel: 'See the project',
        text: 'A household assistant that answers from a curated knowledge base, with retrieval through EmbedRoute. Product links are checked in code, and unrecognized ones are replaced with search links before a visitor sees them.' },
      { name: 'T-Mobile', kind: 'Earlier employment', to: '/about#experience', linkLabel: 'See my experience',
        text: 'I built an internal automation application that reduced a team’s manual workload by about 80%.' },
    ] },
  { id: 'product-engineering', number: '02', title: 'Software for your business',
    summary: 'Build the website, internal tool, or application your business needs.',
    description: 'Bring the interface, APIs, data, and infrastructure together into a product that people can actually use.',
    work: ['Full-stack web applications', 'API design and service integrations', 'Data pipelines and product analytics', 'Deployment, reliability, and iteration'],
    fit: 'You need an experienced engineer to turn a product direction into working software or improve an existing system.',
    example: '/projects/fab-stats', exampleLabel: 'Explore FaB Stats',
    proof: [
      { name: 'FaB Stats', kind: 'My own product', to: '/projects/fab-stats', linkLabel: 'See the project',
        text: 'Nobody wants to hand-enter matches after a long tournament day, so I built a Chrome extension that imports a whole tournament in one click. As of November 2026, FaB Stats has about 3,900 registered players and about 1.6 million matches.' },
      { name: 'Bench Only', kind: 'My own product', to: '/projects/bench-only', linkLabel: 'See the project',
        text: 'I was tired of fiddling with spreadsheets between sets, so I built an offline-first app that writes each session from your training history. OpenAI calls stay server-side behind Firebase auth, with spend tracked per user.' },
    ] },
  { id: 'principal-engineering', number: '03', title: 'Engineering partnership',
    summary: 'Get hands-on engineering help, from an initial idea to a growing system.',
    description: 'Work through architecture and engineering tradeoffs with your team, with hands-on implementation where it matters.',
    work: ['Architecture and technical direction', 'Assessment of existing systems', 'Implementation planning and code review', 'Engineering mentorship and delivery support'],
    fit: 'Your team needs senior technical ownership across a complex system, a new capability, or an important transition.',
    example: '/about', exampleLabel: 'See my background',
    proof: [
      { name: 'Capital One', kind: 'Earlier employment', to: '/about#experience', linkLabel: 'See my experience',
        text: 'As a senior software engineer, I built Python microservices and automated testing infrastructure with AWS Lambda and S3, and mentored an intern who shipped a test automation tool for the team.' },
    ] },
];
