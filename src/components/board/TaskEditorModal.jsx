import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AgentChip } from './TaskCard';
import { AGENTS, AGENT_ORDER } from '../../data/agents';
import { BOARD_COLUMNS } from '../../utils/boardStatus';
import { projects } from '../../data/projects';

const PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const PROJECT_OPTIONS = [
  { id: '_meta', title: 'Portfolio (cross-project)' },
  ...projects.map((p) => ({ id: p.id, title: p.title })),
];

const AGENT_OPTIONS = AGENT_ORDER.filter((k) => AGENTS[k]);

export default function TaskEditorModal({ task, onClose, onSave, onDelete, saving, error }) {
  const isEdit = !!task?.id;
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [projectId, setProjectId] = useState(task?.projectId || '_meta');
  const [status, setStatus] = useState(task?.status || 'backlog');
  const [priority, setPriority] = useState(task?.priority || '');
  const [visibility, setVisibility] = useState(task?.visibility || 'public');
  const [link, setLink] = useState(task?.link || '');
  const [agentIds, setAgentIds] = useState(task?.agentIds || []);
  const [armDelete, setArmDelete] = useState(false);

  // Anything typed since open? Overlay clicks only close a pristine editor —
  // explicit Cancel/X/Escape still always work.
  const dirty =
    title !== (task?.title || '') ||
    description !== (task?.description || '') ||
    projectId !== (task?.projectId || '_meta') ||
    status !== (task?.status || 'backlog') ||
    priority !== (task?.priority || '') ||
    visibility !== (task?.visibility || 'public') ||
    link !== (task?.link || '') ||
    JSON.stringify(agentIds) !== JSON.stringify(task?.agentIds || []);

  // Escape closes; focus returns to whatever opened the modal. The opener is
  // captured in a state initializer (runs during the first render) — by the
  // time effects fire, the autofocused Title input already holds focus.
  const [opener] = useState(() => document.activeElement);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAgent = (key) =>
    setAgentIds((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        projectId,
        status,
        priority: priority || null,
        visibility,
        link: link.trim(),
        source: task?.source || '',
        agentIds,
      },
      task?.id
    );
  };

  return (
    <motion.div
      className="board-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => {
        if (!dirty) onClose();
      }}
    >
      <motion.div
        className="board-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-modal-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="board-modal-head">
          <h3 id="board-modal-title">{isEdit ? 'Edit task' : 'New task'}</h3>
          <button className="board-modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="board-modal-form" onSubmit={submit}>
          <label className="board-field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="What needs doing?"
            />
          </label>

          <label className="board-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional detail"
            />
          </label>

          <div className="board-field-row">
            <label className="board-field">
              <span>Epic</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {PROJECT_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="board-field">
              <span>Column</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {BOARD_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="board-field-row">
            <label className="board-field">
              <span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="board-field">
              <span>Visibility</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="public">Public</option>
                <option value="private">Private (off the public board)</option>
              </select>
            </label>
          </div>

          <label className="board-field">
            <span>Link (optional)</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://github.com/…  (issue, PR, or branch)"
            />
          </label>

          <div className="board-field">
            <span>Assignees</span>
            <div className="board-agent-picker">
              {AGENT_OPTIONS.map((key) => (
                <button
                  type="button"
                  key={key}
                  className={`board-agent-option${agentIds.includes(key) ? ' selected' : ''}`}
                  onClick={() => toggleAgent(key)}
                  title={AGENTS[key]?.name || key}
                  aria-pressed={agentIds.includes(key)}
                  style={agentIds.includes(key) ? { borderColor: AGENTS[key]?.color } : undefined}
                >
                  <AgentChip agentKey={key} size={18} className="sm" />
                  <span>{AGENTS[key]?.name || key}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="board-modal-error">{error}</p>}

          <div className="board-modal-actions">
            {isEdit &&
              (armDelete ? (
                <span className="board-delete-confirm">
                  <button
                    type="button"
                    className="board-btn danger"
                    onClick={() => onDelete(task.id)}
                    disabled={saving}
                  >
                    Really delete?
                  </button>
                  <button
                    type="button"
                    className="board-btn ghost"
                    onClick={() => setArmDelete(false)}
                    disabled={saving}
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="board-btn danger"
                  onClick={() => setArmDelete(true)}
                  disabled={saving}
                >
                  Delete
                </button>
              ))}
            <div className="board-modal-actions-right">
              <button type="button" className="board-btn ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="board-btn primary" disabled={saving || !title.trim()}>
                {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
