import React from 'react';
import { Link } from 'react-router-dom';

const systems = [
  { title: 'A grounded assistant', description: 'The assistant answers questions about my work only from records I wrote or checked. Streaming and fallback responses share the same instructions.', to: '/chat', link: 'Try the assistant' },
  { title: 'Shared AI infrastructure', description: 'The assistant and my agents call one shared tool API for data. Usage and error tracking help keep those systems maintainable.', to: '/projects/azoni-ai', link: 'Explore the infrastructure' },
  { title: 'Public build notes', description: 'Build notes are generated each day from public commits in my own projects, checked before they are published, and link to every commit.', to: '/blog', link: 'Read build notes' },
];
export default function HowThisSiteRuns() {
  return <section className="consult-system-overview" aria-labelledby="system-overview-heading"><h2 id="system-overview-heading">How this site works</h2><p>A working example of the software and AI systems I build.</p><div>{systems.map((system, index) => <article key={system.title}><span className="consult-number">0{index + 1}</span><div><h3>{system.title}</h3><p>{system.description}</p><Link className="consult-text-link" to={system.to}>{system.link} →</Link></div></article>)}</div></section>;
}
