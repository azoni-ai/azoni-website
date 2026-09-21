import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { AI_TOOLS } from '../data/aiToolsMeta';
import '../styles/ai-tools-warm.css';

// One published AI tool note. Reads the Netlify function only; never Firestore.

const ENDPOINT = '/.netlify/functions/ai-tools';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isHttp = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

// An image source is either http(s) or a site-relative path. "//host/x" is
// protocol-relative, so it is not site-relative and is rejected.
const isAsset = (url) => isHttp(url) || (typeof url === 'string' && /^\/(?![/\\])/.test(url));

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_err) {
    return url;
  }
};

// Inline markdown: **bold**, *italic*, `code`, [text](url). Builds elements,
// never HTML strings. Links must be http(s) or site-relative to render as <a>.
const INLINE_RE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(?<!\*)\*([^*]+)\*(?!\*)/g;

const renderInline = (text) => {
  const out = [];
  let last = 0;
  let key = 0;
  let m;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={key++}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      out.push(<code key={key++}>{m[2]}</code>);
    } else if (m[3] !== undefined) {
      const href = m[4];
      if (isHttp(href)) {
        out.push(
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
            {m[3]}
          </a>
        );
      } else if (/^\/(?![/\\])/.test(href)) {
        // Site-relative only; a protocol-relative "//host" must not become a Link.
        out.push(<Link key={key++} to={href}>{m[3]}</Link>);
      } else {
        out.push(m[3]);
      }
    } else if (m[5] !== undefined) {
      out.push(<em key={key++}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

// Block markdown: paragraphs, ## / ### headings, - lists. Line based, so a
// heading or list does not need a blank line before it.
const renderMarkdown = (text) => {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'ul', items: list });
    list = [];
  };
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: heading[1].length >= 3 ? 'h3' : 'h2', text: heading[2] });
      return;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushPara();
      list.push(item[1]);
      return;
    }
    flushList();
    para.push(line);
  });
  flushPara();
  flushList();

  return blocks.map((b, i) => {
    if (b.type === 'h2') return <h2 key={i}>{renderInline(b.text)}</h2>;
    if (b.type === 'h3') return <h3 key={i}>{renderInline(b.text)}</h3>;
    if (b.type === 'ul') {
      return (
        <ul key={i}>
          {b.items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{renderInline(b.text)}</p>;
  });
};

const toParagraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);

const BackLink = () => (
  <Link to={AI_TOOLS.path} className="ai-tools-back">
    <span aria-hidden="true">←</span> All tools
  </Link>
);

// The logo square. A missing file swaps to the first letter of the name so a
// dead URL never leaves a broken image icon next to the title.
const ToolLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const usable = isAsset(src) && !failed;
  return (
    <span className="ai-tools-detail-logo" aria-hidden="true">
      {usable ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="ai-tools-logo-fallback">{(name || '?').charAt(0)}</span>
      )}
    </span>
  );
};

// Hero and product images remove themselves when the file is missing.
const HeroImage = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!isAsset(src) || failed) return null;
  return (
    <img
      className="ai-tools-hero"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const ProductMedia = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (!isAsset(src) || failed) return null;
  return (
    <span className="ai-tools-product-media">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </span>
  );
};

const AiToolDetail = () => {
  const { slug } = useParams();
  const [tool, setTool] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | notfound | error | ready

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setTool(null);
    const load = async () => {
      try {
        const res = await fetch(`${ENDPOINT}?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 404) {
          setStatus('notfound');
          return;
        }
        if (!res.ok || data.error || !data.tool) {
          setStatus('error');
          return;
        }
        setTool(data.tool);
        setStatus('ready');
      } catch (_err) {
        if (!cancelled) setStatus('error');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const path = `${AI_TOOLS.path}/${slug}`;

  if (status !== 'ready') {
    const message =
      status === 'loading' ? 'Loading…' : status === 'notfound' ? 'Not found.' : 'Could not load this tool.';
    return (
      <Layout>
        <Seo title={AI_TOOLS.title} description={AI_TOOLS.description} path={path} noIndex={status !== 'loading'} />
        <div className="ai-tools-page">
          <div className="ai-tools-inner ai-tools-inner--narrow ai-tools-centered">
            <p className="ai-tools-status">{message}</p>
            {status !== 'loading' && <BackLink />}
          </div>
        </div>
      </Layout>
    );
  }

  const links = tool.links || {};
  const pros = Array.isArray(tool.pros) ? tool.pros.filter(Boolean) : [];
  const cons = Array.isArray(tool.cons) ? tool.cons.filter(Boolean) : [];
  const voices = Array.isArray(tool.voices) ? tool.voices.filter((v) => v && v.summary) : [];
  const sources = Array.isArray(tool.sources) ? tool.sources.filter((s) => s && isHttp(s.url)) : [];
  const products = Array.isArray(tool.products) ? tool.products.filter((p) => p && p.name) : [];
  const summaryParas = toParagraphs(tool.summary);
  const takeBlocks = tool.myTake && tool.myTake.trim() ? renderMarkdown(tool.myTake) : [];

  const reviewed = formatDate(tool.publishedAt);
  const updated = formatDate(tool.updatedAt);
  const showUpdated = updated && updated !== reviewed;

  const facts = [
    tool.maker && { label: 'Maker', value: tool.maker },
    tool.pricing && { label: 'Pricing', value: tool.pricing },
    reviewed && { label: 'Reviewed', value: reviewed },
    showUpdated && { label: 'Updated', value: updated },
  ].filter(Boolean);

  const eyebrow = [tool.category, tool.maker].filter(Boolean).join(' · ');

  return (
    <Layout>
      <Seo
        title={`${tool.name} · ${AI_TOOLS.title}`}
        description={tool.tagline}
        path={path}
        noIndex={AI_TOOLS.unlisted}
      />
      <div className="ai-tools-page">
        <div className="ai-tools-inner ai-tools-inner--narrow">
          <BackLink />

          <header className="ai-tools-detail-header">
            <div className="ai-tools-detail-top">
              <ToolLogo src={tool.logo} name={tool.name} />
              <div className="ai-tools-detail-titles">
                {eyebrow && <p className="ai-tools-eyebrow">{eyebrow}</p>}
                <h1 className="ai-tools-heading">{tool.name}</h1>
                {tool.tagline && <p className="ai-tools-tagline">{tool.tagline}</p>}
              </div>
            </div>
            <div className="ai-tools-actions">
              {isHttp(tool.url) && (
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-tools-cta ai-tools-cta--primary"
                >
                  Visit site <span aria-hidden="true">↗</span>
                </a>
              )}
              {isHttp(links.docs) && (
                <a href={links.docs} target="_blank" rel="noopener noreferrer" className="ai-tools-cta">
                  Docs <span aria-hidden="true">↗</span>
                </a>
              )}
              {isHttp(links.pricing) && (
                <a href={links.pricing} target="_blank" rel="noopener noreferrer" className="ai-tools-cta">
                  Pricing <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </header>

          <HeroImage src={tool.heroImage} alt={tool.name} />

          {facts.length > 0 && (
            <dl className="ai-tools-facts" aria-label="Tool facts">
              {facts.map((f) => (
                <div className="ai-tools-fact" key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {summaryParas.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">What it is</h2>
              <div className="ai-tools-prose">{summaryParas}</div>
            </section>
          )}

          {products.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">Products</h2>
              <div className="ai-tools-products">
                {products.map((p, i) => (
                  <div className="ai-tools-product" key={i}>
                    <ProductMedia src={p.image} />
                    <div className="ai-tools-product-body">
                      <h3 className="ai-tools-product-name">
                        {isHttp(p.url) ? (
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            {p.name} <span aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          p.name
                        )}
                      </h3>
                      {p.description && <p className="ai-tools-product-desc">{p.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pros.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">Pros</h2>
              <ul className="ai-tools-list ai-tools-list--pros">
                {pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          )}

          {cons.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">Cons</h2>
              <ul className="ai-tools-list ai-tools-list--cons">
                {cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}

          {voices.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">What people are saying</h2>
              <ul className="ai-tools-list">
                {voices.map((v, i) => {
                  const label = v.source || (isHttp(v.url) ? hostOf(v.url) : '');
                  return (
                    <li key={i}>
                      {v.summary}
                      {label && (
                        <span className="ai-tools-voice-source">
                          {' · '}
                          {isHttp(v.url) ? (
                            <a href={v.url} target="_blank" rel="noopener noreferrer">
                              {label}
                            </a>
                          ) : (
                            label
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {takeBlocks.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">My take</h2>
              <div className="ai-tools-prose">{takeBlocks}</div>
            </section>
          )}

          {sources.length > 0 && (
            <section className="ai-tools-block">
              <h2 className="ai-tools-block-heading">Sources</h2>
              <ol className="ai-tools-sources">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title || hostOf(s.url)}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AiToolDetail;
