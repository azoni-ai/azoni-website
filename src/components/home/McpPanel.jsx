import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// The MCP server, front and center in the Live section's Tools slot: total tool
// calls, the most-called tools, and an expand toggle for the full registry.
// Data from the cached /mcp-tools function (which reads the MCP's /tools).

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return '0';
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const TOP_N = 6;

const McpPanel = () => {
  const [data, setData] = useState(null); // null = loading, object = loaded/failed
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/mcp-tools');
        if (!res.ok) throw new Error('bad');
        if (!(res.headers.get('content-type') || '').includes('application/json')) throw new Error('ct');
        const j = await res.json();
        if (alive) setData(j || {});
      } catch { if (alive) setData({}); }
    })();
    return () => { alive = false; };
  }, []);

  const tools = (data?.tools || []).slice().sort((a, b) => (b.calls || 0) - (a.calls || 0));
  const totalTools = data?.totalTools || (tools.length || 37);
  const totalCalls = data?.totalCalls || 0;
  const shown = expanded ? tools : tools.slice(0, TOP_N);

  return (
    <div className="lp-panel lp-panel--wide mcp-panel">
      <div className="lp-panel-head">
        <div className="mcp-head-left">
          <h3 className="lp-panel-title">MCP server</h3>
          <span className="mcp-summary">
            {totalTools} tools
            {data !== null && <> &middot; <strong>{fmt(totalCalls)}</strong> calls</>}
          </span>
        </div>
        <Link to="/projects/azoni-mcp" className="lp-panel-link">Details &rarr;</Link>
      </div>

      {data === null ? (
        <p className="lp-empty">Loading&hellip;</p>
      ) : tools.length === 0 ? (
        <p className="lp-empty">
          <Link to="/projects/azoni-mcp">See the MCP server &rarr;</Link>
        </p>
      ) : (
        <>
          <ul className="mcp-tool-list">
            {shown.map((t) => (
              <li key={`${t.domain}/${t.name}`} className="mcp-tool">
                <span className="mcp-tool-name">{t.name}</span>
                <span className="mcp-tool-domain">{t.domain}</span>
                <span className="mcp-tool-calls">{fmt(t.calls)}</span>
              </li>
            ))}
          </ul>
          {tools.length > TOP_N && (
            <button
              type="button"
              className="mcp-expand"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Show fewer' : `Show all ${totalTools} tools`}
              <span aria-hidden="true">{expanded ? ' ▴' : ' ▾'}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default McpPanel;
