import React from 'react';
import { Link } from 'react-router-dom';

const systems = [
  { title: 'A grounded assistant', description: 'The assistant uses confirmed background and project information to answer questions about my work. Streaming and fallback responses share the same instructions.', to: '/chat', link: 'Try the assistant' },
  { title: 'Shared AI infrastructure', description: 'Retrieval and authenticated tool integrations connect AI features to useful application data. Usage and error tracking help make those systems maintainable.', to: '/projects/azoni-mcp', link: 'Explore the infrastructure' },
  { title: 'Public build notes', description: 'Automated writing draws from an approved set of independent public repositories. Each article is clearly identified as AI-generated.', to: '/blog', link: 'Read build notes' },
];
export default function HowThisSiteRuns() {
  return <section className="consult-system-overview" aria-labelledby="system-overview-heading"><h2 id="system-overview-heading">How this site works</h2><p>A working example of the software and AI systems I build.</p><div>{systems.map((system, index) => <article key={system.title}><span className="consult-number">0{index + 1}</span><div><h3>{system.title}</h3><p>{system.description}</p><Link className="consult-text-link" to={system.to}>{system.link} →</Link></div></article>)}</div></section>;
}
