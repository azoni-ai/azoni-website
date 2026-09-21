import React, { useEffect, useRef, useState } from 'react';
import { AI_TOOL_CATEGORIES, toolUrl } from '../../data/aiToolsMeta';
import {
  deleteTool, publishTool, researchTool, unpublishTool, updateTool,
} from '../../utils/aiToolsApi';
import {
  byNewest, clearDraft, errorMessage, fmtDate, fmtDateTime, parseForm, readDraft, rowId,
  toForm, validateFields, writeDraft,
} from './aitools-lib';
import ShareSection from './ShareSection';

const hasFacts = (t) =>
  !!(t.maker || t.summary || t.tagline || t.verdict || (t.pros || []).length || (t.cons || []).length);
const hasVoices = (t) => (t.voices || []).length > 0;

const OVERWRITE = {
  facts: 'Research facts replaces maker, tagline, summary, pricing, links, tags, pros, cons and verdict with new results. Continue?',
  voices: 'Research reception replaces the What people are saying list with new results. Continue?',
};

const LOGO_HINT = "Use the tool's own logo file or a path like /images/tools/name.png";

// Thumbnail for a logo or hero image field. Shows nothing until the file
// loads, so a half-typed path does not leave a broken image in the form.
const AssetPreview = ({ src, label }) => {
  const [broken, setBroken] = useState(false);
  const value = String(src || '').trim();
  useEffect(() => {
    setBroken(false);
  }, [value]);
  if (!value || broken) return null;
  return <img className="ait-thumb" src={value} alt={label} onError={() => setBroken(true)} />;
};

// Mounted with key={tool.slug} by the parent, so opening a different tool
// remounts the editor and the local form starts clean.
const ToolEditor = ({ tool, onToolChange, onClose, onDeleted, onDirtyChange }) => {
  const [current, setCurrent] = useState(tool);
  // True when the form came back from a stored draft (see readDraft).
  const restoredRef = useRef(false);
  const [form, setForm] = useState(() => {
    const base = toForm(tool);
    const saved = readDraft(tool.slug);
    if (!saved) return base;
    restoredRef.current = true;
    // Fresh row ids so keys never collide with rows added after the restore.
    // A draft written before a row list existed falls back to the saved doc.
    const reId = (rows, fallback) =>
      (Array.isArray(rows) ? rows : fallback).map((r) => ({ ...r, id: rowId() }));
    return {
      ...base,
      ...saved,
      products: reId(saved.products, base.products),
      voices: reId(saved.voices, base.voices),
      sources: reId(saved.sources, base.sources),
    };
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [publicHint, setPublicHint] = useState(false);
  // Latest form for async handlers (a save can finish after more typing).
  const formRef = useRef(form);
  const dirtyRef = useRef(false);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const setDirtyState = (d) => {
    dirtyRef.current = d;
    setDirty(d);
    onDirtyChange(d);
  };

  useEffect(() => {
    if (restoredRef.current) {
      setDirtyState(true);
      setNotice('Restored unsaved edits from this browser session.');
    }
    // Mount only: the restore happened in the form initializer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (updater) => {
    const next = updater(formRef.current);
    formRef.current = next;
    setForm(next);
    writeDraft(tool.slug, next);
    if (!dirtyRef.current) setDirtyState(true);
  };

  const set = (k) => (e) => {
    const value = e.target.value;
    updateForm((f) => ({ ...f, [k]: value }));
  };

  const setRow = (list, id, k) => (e) => {
    const value = e.target.value;
    updateForm((f) => ({
      ...f,
      [list]: f[list].map((r) => (r.id === id ? { ...r, [k]: value } : r)),
    }));
  };
  const addRow = (list, blank) =>
    updateForm((f) => ({ ...f, [list]: [...f[list], { id: rowId(), ...blank }] }));
  const removeRow = (list, id) =>
    updateForm((f) => ({ ...f, [list]: f[list].filter((r) => r.id !== id) }));

  // Replace everything from a server response (save, research, publish).
  const apply = (t) => {
    setCurrent(t);
    const next = toForm(t);
    formRef.current = next;
    setForm(next);
    clearDraft(tool.slug);
    setDirtyState(false);
    onToolChange(t);
  };

  // Metadata-only change (share, unpublish): keep the form and its dirty flag.
  const applyMeta = (t) => {
    setCurrent(t);
    onToolChange(t);
  };

  const begin = (what) => {
    setBusy(what);
    setError('');
    setNotice('');
  };

  // Saves the form when it has edits; returns the doc to keep working from.
  const saveIfDirty = async () => {
    if (!dirtyRef.current) return current;
    const fields = parseForm(formRef.current);
    const problem = validateFields(fields);
    if (problem) throw new Error(problem);
    const res = await updateTool(current.slug, fields);
    apply(res.tool);
    return res.tool;
  };

  const save = async () => {
    begin('save');
    const snapshot = formRef.current;
    try {
      const fields = parseForm(snapshot);
      const problem = validateFields(fields);
      if (problem) throw new Error(problem);
      const res = await updateTool(current.slug, fields);
      if (formRef.current === snapshot) {
        apply(res.tool);
        setNotice('Saved.');
      } else {
        // Edits landed while the request was out; keep them and stay dirty.
        applyMeta(res.tool);
        setNotice('Saved. Edits made during the save are still unsaved.');
      }
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy('');
  };

  const research = async (mode) => {
    // Unsaved edits get saved first, so judge the overwrite on what the form
    // holds now, not on the last saved doc.
    const snapshot = dirtyRef.current ? parseForm(formRef.current) : current;
    const overwrite = mode === 'facts' ? hasFacts(snapshot) : hasVoices(snapshot);
    if (overwrite && !window.confirm(OVERWRITE[mode])) return;
    begin(mode);
    try {
      const base = await saveIfDirty();
      const res = await researchTool(base.slug, mode);
      apply(res.tool);
      const cost = typeof res.cost === 'number' ? ` Cost $${res.cost.toFixed(3)}.` : '';
      setNotice(`${mode === 'facts' ? 'Facts' : 'Reception'} research done.${cost}`);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy('');
  };

  const publish = async () => {
    begin('publish');
    try {
      const base = await saveIfDirty();
      const res = await publishTool(base.slug);
      apply(res.tool);
      setPublicHint(true);
      setNotice('Published.');
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy('');
  };

  const unpublish = async () => {
    begin('unpublish');
    try {
      const res = await unpublishTool(current.slug);
      applyMeta(res.tool);
      setPublicHint(false);
      setNotice('Unpublished. The public list drops it within a couple of minutes.');
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy('');
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${current.name || current.slug}? This cannot be undone.`)) return;
    begin('delete');
    try {
      await deleteTool(current.slug);
      clearDraft(tool.slug);
      setDirtyState(false);
      onDeleted(current.slug);
      return;
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy('');
  };

  const published = current.status === 'published';
  const label = (key, idle, active) => (busy === key ? active : idle);
  const categories =
    form.category && !AI_TOOL_CATEGORIES.includes(form.category)
      ? [form.category, ...AI_TOOL_CATEGORIES]
      : AI_TOOL_CATEGORIES;
  const history = [...(current.history || [])].sort(byNewest);
  const publicUrl = toolUrl(current.slug);

  return (
    <div className="ait-editor">
      <div className="ait-card">
        <div className="ait-editor-head">
          <div>
            <h3>
              {current.name || current.slug}
              <span className={`ait-pill ${current.status}`}>{current.status}</span>
            </h3>
            <div className="ait-meta">
              {current.slug}
              {current.createdAt && ` · created ${fmtDate(current.createdAt)}`}
              {current.publishedAt && ` · published ${fmtDate(current.publishedAt)}`}
              {current.research && current.research.at &&
                ` · last research ${current.research.mode} ${fmtDateTime(current.research.at)}`}
              {published && (
                <>
                  {' · '}
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">public page</a>
                </>
              )}
            </div>
          </div>
          <div className="ait-actions">
            <button className="ait-btn" disabled={!!busy} onClick={() => research('facts')}>
              {label('facts', 'Research facts', 'Researching…')}
            </button>
            <button className="ait-btn" disabled={!!busy} onClick={() => research('voices')}>
              {label('voices', 'Research reception', 'Researching…')}
            </button>
            <button className="ait-btn primary" disabled={!!busy || !dirty} onClick={save}>
              {label('save', 'Save', 'Saving…')}
            </button>
            {published ? (
              <button className="ait-btn" disabled={!!busy} onClick={unpublish}>
                {label('unpublish', 'Unpublish', 'Unpublishing…')}
              </button>
            ) : (
              <button className="ait-btn" disabled={!!busy} onClick={publish}>
                {label('publish', 'Publish', 'Publishing…')}
              </button>
            )}
            <button className="ait-btn danger" disabled={!!busy} onClick={remove}>
              {label('delete', 'Delete', 'Deleting…')}
            </button>
            <button className="ait-btn" disabled={!!busy} onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="ait-statusline">
          {dirty && <span className="ait-dirty">Unsaved changes</span>}
          {notice && <span className="ait-notice">{notice}</span>}
          {error && <span className="ait-error">{error}</span>}
          {publicHint && published && (
            <span className="ait-hint inline">
              Public page updates within a couple of minutes.{' '}
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>
            </span>
          )}
        </div>

        <div className="ait-frow">
          <label className="ait-fld grow">
            <span>Name</span>
            <input type="text" maxLength={80} value={form.name} onChange={set('name')} />
          </label>
          <label className="ait-fld grow">
            <span>Maker</span>
            <input
              type="text" maxLength={80} placeholder="Company or person"
              value={form.maker} onChange={set('maker')}
            />
          </label>
          <label className="ait-fld grow">
            <span>Category</span>
            <select value={form.category} onChange={set('category')}>
              {!form.category && <option value="">Choose a category</option>}
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="ait-frow">
          <label className="ait-fld grow2">
            <span>URL</span>
            <input
              type="url" maxLength={300} placeholder="https://"
              value={form.url} onChange={set('url')}
            />
          </label>
          <label className="ait-fld grow">
            <span>Pricing</span>
            <input
              type="text" maxLength={200} placeholder="Free tier; Pro $20/month"
              value={form.pricing} onChange={set('pricing')}
            />
          </label>
        </div>
        <div className="ait-frow">
          <label className="ait-fld grow">
            <span>Site link</span>
            <input
              type="url" maxLength={300} placeholder="https://"
              value={form.site} onChange={set('site')}
            />
          </label>
          <label className="ait-fld grow">
            <span>Docs link</span>
            <input
              type="url" maxLength={300} placeholder="https://"
              value={form.docs} onChange={set('docs')}
            />
          </label>
          <label className="ait-fld grow">
            <span>Pricing link</span>
            <input
              type="url" maxLength={300} placeholder="https://"
              value={form.pricingUrl} onChange={set('pricingUrl')}
            />
          </label>
        </div>
        <div className="ait-frow">
          <div className="ait-asset">
            <label className="ait-fld grow">
              <span>Logo URL</span>
              <input
                type="text" maxLength={300} placeholder="https:// or /images/tools/name.png"
                value={form.logo} onChange={set('logo')}
              />
              <small className="ait-hint">{LOGO_HINT}</small>
            </label>
            <AssetPreview src={form.logo} label="Logo preview" />
          </div>
          <div className="ait-asset">
            <label className="ait-fld grow">
              <span>Hero image URL</span>
              <input
                type="text" maxLength={300} placeholder="https:// or /images/tools/name-hero.png"
                value={form.heroImage} onChange={set('heroImage')}
              />
              <small className="ait-hint">Wide image shown under the header on the public page.</small>
            </label>
            <AssetPreview src={form.heroImage} label="Hero image preview" />
          </div>
        </div>
        <label className="ait-fld full">
          <span>Tags (comma separated, up to 12)</span>
          <input
            type="text" placeholder="coding, agents, open source"
            value={form.tags} onChange={set('tags')}
          />
        </label>
        <label className="ait-fld full">
          <span>Tagline (one sentence)</span>
          <input type="text" maxLength={160} value={form.tagline} onChange={set('tagline')} />
        </label>
        <label className="ait-fld full">
          <span>What it is (paragraphs separated by a blank line)</span>
          <textarea rows={6} maxLength={4000} value={form.summary} onChange={set('summary')} />
        </label>
        <div className="ait-section">
          <div className="ait-section-head">
            <span className="ait-label">Products (up to 8)</span>
            <button
              className="ait-linkish" type="button"
              onClick={() => addRow('products', { name: '', description: '', image: '', url: '' })}
            >
              Add product
            </button>
          </div>
          {form.products.length ? (
            form.products.map((p) => (
              <div className="ait-row four" key={p.id}>
                <input
                  type="text" aria-label="Product name" maxLength={60} placeholder="Product name"
                  value={p.name} onChange={setRow('products', p.id, 'name')}
                />
                <input
                  type="text" aria-label="Product description" maxLength={240}
                  placeholder="One or two sentences on what it does"
                  value={p.description} onChange={setRow('products', p.id, 'description')}
                />
                <input
                  type="text" aria-label="Product image" maxLength={300}
                  placeholder="/images/tools/name-product.png"
                  value={p.image} onChange={setRow('products', p.id, 'image')}
                />
                <input
                  type="url" aria-label="Product link" maxLength={300}
                  placeholder="https:// (optional)"
                  value={p.url} onChange={setRow('products', p.id, 'url')}
                />
                <button
                  className="ait-linkish danger" type="button"
                  onClick={() => removeRow('products', p.id)}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="ait-empty">
              No products yet. Add one for each part of the tool worth showing on its page.
            </div>
          )}
        </div>

        <div className="ait-frow">
          <label className="ait-fld grow">
            <span>Pros (one per line)</span>
            <textarea rows={6} value={form.pros} onChange={set('pros')} />
          </label>
          <label className="ait-fld grow">
            <span>Cons (one per line)</span>
            <textarea rows={6} value={form.cons} onChange={set('cons')} />
          </label>
        </div>

        <div className="ait-section">
          <div className="ait-section-head">
            <span className="ait-label">What people are saying</span>
            <button
              className="ait-linkish" type="button"
              onClick={() => addRow('voices', { summary: '', source: '', url: '' })}
            >
              Add row
            </button>
          </div>
          {form.voices.length ? (
            form.voices.map((v) => (
              <div className="ait-row" key={v.id}>
                <input
                  type="text" aria-label="Summary"
                  placeholder="One sentence paraphrasing one point"
                  value={v.summary} onChange={setRow('voices', v.id, 'summary')}
                />
                <input
                  type="text" aria-label="Source" placeholder="Site or author"
                  value={v.source} onChange={setRow('voices', v.id, 'source')}
                />
                <input
                  type="url" aria-label="Link" placeholder="https:// (empty if unsourced)"
                  value={v.url} onChange={setRow('voices', v.id, 'url')}
                />
                <button
                  className="ait-linkish danger" type="button"
                  onClick={() => removeRow('voices', v.id)}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="ait-empty">No voices yet. Run Research reception or add a row.</div>
          )}
        </div>

        <label className="ait-fld full">
          <span>Verdict (one sentence)</span>
          <input type="text" maxLength={200} value={form.verdict} onChange={set('verdict')} />
        </label>
        <label className="ait-fld full">
          <span>My take (markdown: paragraphs, ## headings, - lists, **bold**, [text](url))</span>
          <textarea
            className="mono" rows={12} maxLength={8000}
            value={form.myTake} onChange={set('myTake')}
          />
        </label>

        <div className="ait-section">
          <div className="ait-section-head">
            <span className="ait-label">Sources</span>
            <button
              className="ait-linkish" type="button"
              onClick={() => addRow('sources', { title: '', url: '' })}
            >
              Add row
            </button>
          </div>
          {form.sources.length ? (
            form.sources.map((s) => (
              <div className="ait-row two" key={s.id}>
                <input
                  type="text" aria-label="Title" placeholder="Title"
                  value={s.title} onChange={setRow('sources', s.id, 'title')}
                />
                <input
                  type="url" aria-label="Link" placeholder="https://"
                  value={s.url} onChange={setRow('sources', s.id, 'url')}
                />
                <button
                  className="ait-linkish danger" type="button"
                  onClick={() => removeRow('sources', s.id)}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="ait-empty">No sources yet. Research adds citations here.</div>
          )}
        </div>

        <div className="ait-actions" style={{ marginTop: 14 }}>
          <button className="ait-btn primary" disabled={!!busy || !dirty} onClick={save}>
            {label('save', 'Save', 'Saving…')}
          </button>
          {dirty && <span className="ait-dirty">Unsaved changes</span>}
          {error && <span className="ait-error">{error}</span>}
        </div>
      </div>

      {published && <ShareSection tool={current} onToolChange={applyMeta} />}

      <div className="ait-card">
        <h3>History</h3>
        {history.length ? (
          <ul className="ait-list mono">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                {fmtDateTime(h.at)} · {h.event}
                {h.note ? ` · ${h.note}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ait-hint">No history yet.</p>
        )}
      </div>
    </div>
  );
};

export default ToolEditor;
