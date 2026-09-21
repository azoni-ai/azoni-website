import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigationType, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import { AI_TOOLS } from '../data/aiToolsMeta';
import '../styles/ai-tools-warm.css';

// Public list of published AI tool notes. Reads the Netlify function only;
// this page never touches Firestore directly.

const ENDPOINT = '/.netlify/functions/ai-tools';
const ALL = 'All';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// An image source is either http(s) or a site-relative path. "//host/x" is
// protocol-relative, so it is not site-relative and is rejected.
const isAsset = (url) =>
  typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?![/\\])/.test(url));

// The logo square. A missing file swaps to the first letter of the name so a
// dead URL never leaves a broken image icon on the card.
const ToolLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const usable = isAsset(src) && !failed;
  return (
    <span className="ai-tools-card-logo" aria-hidden="true">
      {usable ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="ai-tools-logo-fallback">{(name || '?').charAt(0)}</span>
      )}
    </span>
  );
};

const AiTools = () => {
  const [tools, setTools] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | error | ready
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(ENDPOINT);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error || !Array.isArray(data.tools)) {
          setStatus('error');
          return;
        }
        setTools(data.tools);
        setStatus('ready');
      } catch (_err) {
        if (!cancelled) setStatus('error');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only categories that appear in the data get a chip.
  const categories = useMemo(() => {
    const set = new Set();
    tools.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tools]);

  // The search box is plain local state so keystrokes never wait on the
  // router (its navigations are transitions and can lag a fast typist). The
  // URL follows a beat later, and feeds the box only on back/forward.
  const navType = useNavigationType();
  const [text, setText] = useState(() => params.get('q') || '');
  const urlTimer = useRef(null);
  const urlQ = params.get('q') || '';
  useEffect(() => {
    if (navType === 'POP') setText(urlQ);
  }, [navType, urlQ]);
  useEffect(() => () => clearTimeout(urlTimer.current), []);
  const q = text;
  const requestedCategory = params.get('category') || '';
  const category = categories.includes(requestedCategory) ? requestedCategory : ALL;

  // Drop a category param that does not match any published tool.
  useEffect(() => {
    if (status !== 'ready') return;
    if (requestedCategory && !categories.includes(requestedCategory)) {
      const next = new URLSearchParams(params);
      next.delete('category');
      setParams(next, { replace: true });
    }
  }, [status, categories, requestedCategory, params, setParams]);

  // Functional form: a debounced search update must not clobber a category
  // chip clicked in the meantime.
  const updateParams = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) => {
            if (value) next.set(key, value);
            else next.delete(key);
          });
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const onSearch = (e) => {
    const value = e.target.value;
    setText(value);
    clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => updateParams({ q: value }), 250);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tools.filter((t) => {
      if (category !== ALL && t.category !== category) return false;
      if (!needle) return true;
      const hay = [t.name, t.maker, t.tagline, ...(Array.isArray(t.tags) ? t.tags : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [tools, q, category]);

  const count = tools.length;

  const renderBody = () => {
    if (status === 'loading') {
      return <p className="ai-tools-status">Loading tools&hellip;</p>;
    }
    if (status === 'error') {
      return <p className="ai-tools-status">Could not load tools.</p>;
    }
    if (count === 0) {
      return <p className="ai-tools-status">No tools yet.</p>;
    }
    if (filtered.length === 0) {
      return <p className="ai-tools-status">No tools match.</p>;
    }
    return (
      <div className="ai-tools-grid">
        {filtered.map((t) => {
          const meta = [t.maker, t.category].filter(Boolean).join(' · ');
          const tags = Array.isArray(t.tags) ? t.tags.slice(0, 3) : [];
          const reviewed = formatDate(t.publishedAt);
          return (
            <Link to={`${AI_TOOLS.path}/${t.slug}`} key={t.slug} className="ai-tools-card">
              <ToolLogo src={t.logo} name={t.name} />
              <h2 className="ai-tools-card-name">{t.name}</h2>
              {meta && <span className="ai-tools-card-meta">{meta}</span>}
              {t.tagline && <p className="ai-tools-card-tagline">{t.tagline}</p>}
              {t.verdict && <p className="ai-tools-card-verdict">{t.verdict}</p>}
              {tags.length > 0 && (
                <div className="ai-tools-card-tags">
                  {tags.map((tag) => (
                    <span key={tag} className="ai-tools-tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="ai-tools-card-foot">
                {reviewed && <span className="ai-tools-card-date">Reviewed {reviewed}</span>}
                <span className="ai-tools-card-cta">
                  Read notes <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <Seo
        title={AI_TOOLS.title}
        description={AI_TOOLS.description}
        path={AI_TOOLS.path}
        noIndex={AI_TOOLS.unlisted}
      />
      <div className="ai-tools-page">
        <div className="ai-tools-inner">
          <header className="ai-tools-header">
            <h1 className="ai-tools-heading">{AI_TOOLS.title}</h1>
            <p className="ai-tools-tagline">{AI_TOOLS.tagline}</p>
            <div className="ai-tools-header-meta">
              {status === 'ready' && (
                <span className="ai-tools-count">
                  {count} {count === 1 ? 'tool' : 'tools'}
                </span>
              )}
              <a href={AI_TOOLS.feedPath} className="ai-tools-feed-link">RSS</a>
            </div>
          </header>

          {status === 'ready' && count > 0 && (
            <div className="ai-tools-controls">
              <label className="ai-tools-search">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  placeholder="Search tools"
                  aria-label="Search tools"
                  value={text}
                  onChange={onSearch}
                />
              </label>
              <div className="ai-tools-chips" role="group" aria-label="Category">
                {[ALL, ...categories].map((c) => {
                  const active = c === category;
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`ai-tools-chip${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => updateParams({ category: c === ALL ? '' : c })}
                    >
                      {c === ALL ? 'All tools' : c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {renderBody()}
        </div>
      </div>
    </Layout>
  );
};

export default AiTools;
