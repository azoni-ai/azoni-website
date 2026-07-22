import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Owner editor for a site's hub state: notes, cadence overrides, snooze.
// Follows the TaskEditorModal conventions (dialog semantics, Escape, focus
// restore).

export default function SiteEditorModal({ site, onClose, onSave, saving, error }) {
  const [notes, setNotes] = useState(site.notes || '');
  const [socialCadence, setSocialCadence] = useState(
    site.content?.social?.cadenceDays ?? ''
  );
  const [blogCadence, setBlogCadence] = useState(site.content?.blog?.cadenceDays ?? '');
  const [snoozeDays, setSnoozeDays] = useState('');

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

  const submit = (e) => {
    e.preventDefault();
    const state = { notes: notes.trim() || null, cadence: {} };
    state.cadence.social = socialCadence === '' ? null : Number(socialCadence);
    state.cadence.blog = blogCadence === '' ? null : Number(blogCadence);
    if (snoozeDays !== '' && Number(snoozeDays) > 0) {
      state.snoozeUntil = new Date(Date.now() + Number(snoozeDays) * 86_400_000).toISOString();
    } else if (snoozeDays === '0') {
      state.snoozeUntil = null;
    }
    onSave(site.id, state);
  };

  return (
    <motion.div
      className="board-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="board-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-modal-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="board-modal-head">
          <h3 id="hub-modal-title">{site.name}</h3>
          <button className="board-modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="board-modal-form" onSubmit={submit}>
          <label className="board-field">
            <span>Status note (shown on the card)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Rebuild in progress — content paused"
            />
          </label>

          <div className="board-field-row">
            <label className="board-field">
              <span>Social cadence (days)</span>
              <input
                type="number"
                min="1"
                max="90"
                value={socialCadence}
                onChange={(e) => setSocialCadence(e.target.value)}
                placeholder="untracked"
              />
            </label>
            <label className="board-field">
              <span>Blog cadence (days)</span>
              <input
                type="number"
                min="1"
                max="90"
                value={blogCadence}
                onChange={(e) => setBlogCadence(e.target.value)}
                placeholder="untracked"
              />
            </label>
          </div>

          <label className="board-field">
            <span>Snooze staleness (days from now; 0 clears)</span>
            <input
              type="number"
              min="0"
              max="90"
              value={snoozeDays}
              onChange={(e) => setSnoozeDays(e.target.value)}
              placeholder="not snoozed"
            />
          </label>

          {error && <p className="board-modal-error">{error}</p>}

          <div className="board-modal-actions">
            <div className="board-modal-actions-right">
              <button type="button" className="board-btn ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="board-btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
