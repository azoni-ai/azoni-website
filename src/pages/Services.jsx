import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { services } from '../data/consulting';
export default function Services() {
  return <Layout><Seo title="Software & AI consulting" path="/services" description="Azoni helps businesses of any size improve with software, AI automation, connected workflows, and hands-on engineering by Charlton Smith." />
    <div className="consult-page consult-container">
      <header className="consult-page-heading"><p className="consult-eyebrow">Working with Azoni</p><h1>Useful software.<br /><span>A better working day.</span></h1><p>I help businesses of any size improve how they operate. That might mean automating a repetitive task, connecting existing tools, building a new application, or finding a practical use for AI.</p><Link className="consult-button" to="/contact">Email me <ArrowUpRight size={18} /></Link></header>
      <div className="consult-service-details">{services.map(service => <section className="consult-service-detail" id={service.id} key={service.id}><div><p className="consult-eyebrow">{service.number} / {service.title}</p><h2>{service.summary}</h2><p>{service.description}</p><Link className="consult-text-link" to={service.example}>{service.exampleLabel} <ArrowRight size={16} /></Link></div><div className="consult-service-scope"><h3>Where I can contribute</h3><ul>{service.work.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul><p><strong>A good fit when</strong>{service.fit}</p></div></section>)}</div>
      <section className="consult-cta"><div><h2>Start with what could be better.</h2><p>You know your business. I bring the engineering experience to help turn a good idea into something useful.</p></div><Link className="consult-button" to="/contact">Email me <ArrowUpRight size={18} /></Link></section>
    </div>
  </Layout>;
}
