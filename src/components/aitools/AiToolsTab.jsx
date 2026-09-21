import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AI_TOOL_CATEGORIES } from '../../data/aiToolsMeta';
import { createTool, getTool, importSeed, listTools, refreshToolsCache } from '../../utils/aiToolsApi';
import { clearDraft, errorMessage, isHttpUrl, toListItem } from './aitools-lib';
import ToolList from './ToolList';
import ToolEditor from './ToolEditor';
import './aitools-admin.css';

const emptyNewForm = () => ({ name: '', url: '', category: AI_TOOL_CATEGORIES[0], notes: '' });

const AiToolsTab = () => {
  const [tools, setTools] = useState([]);
  const [listState, setListState] = useState('loading');
  const [listError, setListError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(emptyNewForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [open, setOpen] = useState(null);
  const [opening, setOpening] = useState('');
  const [openError, setOpenError] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildNote, setRebuildNote] = useState({ text: '', error: false });
  const [importing, setImporting] = useState(false);
  const [seedNote, setSeedNote] = useState({ text: '', error: false });
  // Set by the editor; checked before anything would replace it.
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await listTools();
      setTools(Array.isArray(res.tools) ? res.tools : []);
      setNow(Date.now());
      setListError('');
      setListState('ready');
    } catch (e) {
      setListError(errorMessage(e));
      setListState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const retry = () => {
    setListState('loading');
    load();
  };

  const confirmDiscard = () => {
    if (!dirtyRef.current) return true;
    if (!window.confirm('You have unsaved edits. Discard them?')) return false;
    // A confirmed discard also drops the stored draft, or it would come back
    // the next time this tool is opened.
    if (open) clearDraft(open.slug);
    return true;
  };

  const openTool = async (slug) => {
    if (open && open.slug === slug) return;
    if (!confirmDiscard()) return;
    setOpening(slug);
    setOpenError('');
    try {
      const res = await getTool(slug);
      dirtyRef.current = false;
      setOpen(res.tool);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setOpenError(errorMessage(e));
    }
    setOpening('');
  };

  const closeEditor = () => {
    if (!confirmDiscard()) return;
    dirtyRef.current = false;
    setOpen(null);
  };

  const handleToolChange = (tool) => {
    const item = toListItem(tool);
    setTools((list) => {
      const i = list.findIndex((t) => t.slug === tool.slug);
      if (i < 0) return [item, ...list];
      const next = [...list];
      next[i] = item;
      return next;
    });
  };

  const handleDeleted = (slug) => {
    dirtyRef.current = false;
    setOpen(null);
    setTools((list) => list.filter((t) => t.slug !== slug));
  };

  const setNew = (k) => (e) => {
    const value = e.target.value;
    setNewForm((f) => ({ ...f, [k]: value }));
  };

  const submitNew = async (e) => {
    e.preventDefault();
    if (creating) return;
    const name = newForm.name.trim();
    const url = newForm.url.trim();
    if (!name) {
      setCreateError('Name is required.');
      return;
    }
    if (!isHttpUrl(url)) {
      setCreateError('URL must start with http:// or https://.');
      return;
    }
    if (!confirmDiscard()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await createTool({
        name, url, category: newForm.category, notes: newForm.notes.trim(),
      });
      dirtyRef.current = false;
      setTools((list) => [toListItem(res.tool), ...list.filter((t) => t.slug !== res.tool.slug)]);
      setOpen(res.tool);
      setShowNew(false);
      setNewForm(emptyNewForm());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setCreateError(errorMessage(err));
    }
    setCreating(false);
  };

  const rebuild = async () => {
    setRebuilding(true);
    setRebuildNote({ text: '', error: false });
    try {
      const res = await refreshToolsCache();
      const n = Number(res.count) || 0;
      setRebuildNote({ text: `Public list rebuilt with ${n} tool${n === 1 ? '' : 's'}.`, error: false });
    } catch (e) {
      setRebuildNote({ text: errorMessage(e), error: true });
    }
    setRebuilding(false);
  };

  // Starter entries from src/data/aiToolsSeed.js. They land as drafts and a
  // slug that already exists is left untouched, so this is safe to re-run.
  const runImport = async () => {
    if (!window.confirm('Import the starter entries? Existing tools are left alone.')) return;
    setImporting(true);
    setSeedNote({ text: '', error: false });
    try {
      const res = await importSeed();
      const created = Array.isArray(res.created) ? res.created.length : 0;
      const skipped = Array.isArray(res.skipped) ? res.skipped.length : 0;
      setSeedNote({
        text:
          `Imported ${created} ${created === 1 ? 'entry' : 'entries'}. ` +
          `Skipped ${skipped} that already ${skipped === 1 ? 'exists' : 'exist'}.`,
        error: false,
      });
      await load();
    } catch (e) {
      setSeedNote({ text: errorMessage(e), error: true });
    }
    setImporting(false);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter(
        (t) =>
          !q ||
          [t.name, t.maker, t.tagline, t.category, ...(t.tags || [])].some((s) =>
            String(s || '').toLowerCase().includes(q)
          )
      )
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }, [tools, statusFilter, search]);

  return (
    <div className="ait-root">
      <div className="ait-bar">
        <div className="ait-bar-left">
          <select
            className="ait-select"
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
          <input
            className="ait-search"
            type="search"
            aria-label="Search tools"
            placeholder="Search tools"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ait-actions">
          <button className="ait-btn" disabled={refreshing} onClick={refresh}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="ait-btn" disabled={rebuilding} onClick={rebuild}>
            {rebuilding ? 'Rebuilding…' : 'Rebuild public list'}
          </button>
          <button className="ait-btn" disabled={importing} onClick={runImport}>
            {importing ? 'Importing…' : 'Import starter entries'}
          </button>
          <button
            className="ait-btn primary"
            onClick={() => {
              setShowNew((s) => !s);
              setCreateError('');
            }}
          >
            New tool
          </button>
        </div>
      </div>
      {rebuildNote.text && (
        <p className={rebuildNote.error ? 'ait-error' : 'ait-notice'} style={{ margin: '-8px 0 12px' }}>
          {rebuildNote.text}
        </p>
      )}
      {seedNote.text && (
        <p className={seedNote.error ? 'ait-error' : 'ait-notice'} style={{ margin: '-8px 0 12px' }}>
          {seedNote.text}
        </p>
      )}

      {showNew && (
        <div className="ait-card">
          <h3>New tool</h3>
          <form onSubmit={submitNew}>
            <div className="ait-frow">
              <label className="ait-fld grow">
                <span>Name</span>
                <input
                  type="text" required maxLength={80} placeholder="Tool name"
                  value={newForm.name} onChange={setNew('name')}
                />
              </label>
              <label className="ait-fld grow">
                <span>URL</span>
                <input
                  type="url" required maxLength={300} placeholder="https://"
                  value={newForm.url} onChange={setNew('url')}
                />
              </label>
              <label className="ait-fld">
                <span>Category</span>
                <select value={newForm.category} onChange={setNew('category')}>
                  {AI_TOOL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="ait-fld full">
              <span>Notes</span>
              <textarea
                rows={4}
                placeholder="What you already know or think. This becomes the first My take draft."
                value={newForm.notes}
                onChange={setNew('notes')}
              />
            </label>
            <div className="ait-actions" style={{ marginTop: 12 }}>
              <button className="ait-btn primary" type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                className="ait-btn" type="button" disabled={creating}
                onClick={() => {
                  setShowNew(false);
                  setCreateError('');
                }}
              >
                Cancel
              </button>
              {createError && <span className="ait-error">{createError}</span>}
            </div>
          </form>
        </div>
      )}

      {openError && <p className="ait-error" style={{ margin: '0 0 12px' }}>{openError}</p>}

      {open && (
        <ToolEditor
          key={open.slug}
          tool={open}
          onToolChange={handleToolChange}
          onClose={closeEditor}
          onDeleted={handleDeleted}
          onDirtyChange={(d) => {
            dirtyRef.current = d;
          }}
        />
      )}

      <ToolList
        state={listState}
        error={listError}
        tools={shown}
        total={tools.length}
        openSlug={open ? open.slug : ''}
        opening={opening}
        now={now}
        onOpen={openTool}
        onRetry={retry}
      />
    </div>
  );
};

export default AiToolsTab;
