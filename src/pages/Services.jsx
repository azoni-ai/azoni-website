import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { projectEmailHref, services } from '../data/consulting';
export default function Services() {
  return <Layout><Seo title="Software & AI consulting" path="/services" description="Applied AI, full-stack product development, and principal engineering support from Charlton Smith." />
    <div className="consult-page consult-container">
      <header className="consult-page-heading"><p className="consult-eyebrow">Services</p><h1>Technical judgment.<br /><span>Hands-on delivery.</span></h1><p>Software and AI consulting for teams that need a clear direction and someone who can help build it.</p><a className="consult-button" href={projectEmailHref}>Email about a project <ArrowUpRight size={18} /></a></header>
      <div className="consult-service-details">{services.map(service => <section className="consult-service-detail" id={service.id} key={service.id}><div><p className="consult-eyebrow">{service.number} / {service.title}</p><h2>{service.summary}</h2><p>{service.description}</p><Link className="consult-text-link" to={service.example}>{service.exampleLabel} <ArrowRight size={16} /></Link></div><div className="consult-service-scope"><h3>Where I can contribute</h3><ul>{service.work.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul><p><strong>A good fit when</strong>{service.fit}</p></div></section>)}</div>
      <section className="consult-cta"><div><h2>Start with the problem.</h2><p>Share what you're building, what's getting in the way, and the help you need.</p></div><a className="consult-button" href={projectEmailHref}>Email about a project <ArrowUpRight size={18} /></a></section>
    </div>
  </Layout>;
}
