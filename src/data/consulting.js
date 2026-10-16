export const projectEmailHref = 'mailto:charlton@azoni.ai?subject=Project%20inquiry';
export const consulting = {
  name: 'Charlton Smith',
  role: 'Principal Software Engineer & AI Consultant',
  email: 'charlton@azoni.ai',
  description: 'Independent software and AI consulting. Principal engineering, applied AI, and full-stack product development with Charlton Smith.',
  projectEmailHref,
};
export const services = [
  { id: 'applied-ai', number: '01', title: 'Applied AI',
    summary: 'Put AI to work inside a useful product or workflow.',
    description: 'Connect models to the information and tools they need, then build the product experience around them.',
    work: ['AI assistants and knowledge search', 'Retrieval and embedding infrastructure', 'Agent workflows and tool integrations', 'Evaluation, observability, and cost controls'],
    fit: 'You have a specific AI use case and need to find a practical path from prototype to production.',
    example: '/projects/embedroute', exampleLabel: 'Explore EmbedRoute' },
  { id: 'product-engineering', number: '02', title: 'Product engineering',
    summary: 'Build the software around the idea, end to end.',
    description: 'Bring the interface, APIs, data, and infrastructure together into a product that people can actually use.',
    work: ['Full-stack web applications', 'API design and service integrations', 'Data pipelines and product analytics', 'Deployment, reliability, and iteration'],
    fit: 'You need an experienced engineer to turn a product direction into working software or improve an existing system.',
    example: '/projects/fab-stats', exampleLabel: 'Explore FaB Stats' },
  { id: 'principal-engineering', number: '03', title: 'Principal engineering',
    summary: 'Make the important technical decisions and move delivery forward.',
    description: 'Work through architecture and engineering tradeoffs with your team, with hands-on implementation where it matters.',
    work: ['Architecture and technical direction', 'Assessment of existing systems', 'Implementation planning and code review', 'Engineering mentorship and delivery support'],
    fit: 'Your team needs senior technical ownership across a complex system, a new capability, or an important transition.',
    example: '/about', exampleLabel: 'See my background' },
];
