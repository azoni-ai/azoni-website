import React from 'react';
import { ArrowDown, Bot, Database, ListChecks, Server } from 'lucide-react';
import '../styles/work-preview.css';

export default function WorkPreview({ story, className = '', priority = false, showCaption = true }) {
  const preview = story?.preview;
  if (!preview) return null;
  return <figure className={`work-preview ${className}`}>
    {preview.src ? <div className="work-preview-frame"><img src={preview.src} alt={preview.alt} width="1280" height="820" loading={priority ? 'eager' : 'lazy'} /></div> : preview.kind === 'tools' ?
      <div className="work-preview-architecture" role="img" aria-label="Chat and autonomous agents connect to the Azoni MCP server, which provides product tools, data access, and activity logs.">
        <span className="work-preview-kicker">Architecture overview</span>
        <div className="work-preview-clients"><Bot size={20} aria-hidden="true" /><span>Chat &amp; autonomous agents</span></div>
        <ArrowDown className="work-preview-connector" size={22} aria-hidden="true" />
        <div className="work-preview-server"><Server size={24} aria-hidden="true" /><div><strong>Azoni MCP</strong><span>One shared tool server</span></div></div>
        <ArrowDown className="work-preview-connector" size={22} aria-hidden="true" />
        <div className="work-preview-tools"><span><Database size={16} aria-hidden="true" />Product data</span><span><ListChecks size={16} aria-hidden="true" />Tools &amp; activity</span></div>
      </div> : null}
    {showCaption && preview.caption && <figcaption>{preview.caption}</figcaption>}
  </figure>;
}
