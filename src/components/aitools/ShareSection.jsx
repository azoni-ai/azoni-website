import React, { useEffect, useRef, useState } from 'react';
import { SHARE_VENUES } from '../../data/aiToolsMeta';
import { shareTool } from '../../utils/aiToolsApi';
import { buildShareCaption } from './share-caption';
import { byNewest, errorMessage, fmtDate, isHttpUrl } from './aitools-lib';

// Shown only for published tools. The caption starts from the pure helper and
// stays editable; "Reset caption" rebuilds it from the current fields.
const ShareSection = ({ tool, onToolChange }) => {
  const [caption, setCaption] = useState(() => buildShareCaption(tool));
  const [copied, setCopied] = useState(false);
  const [venue, setVenue] = useState(SHARE_VENUES[0]);
  const [postUrl, setPostUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const copiedTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = async () => {
    setError('');
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard is not available in this browser.');
      }
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(e.message || 'Copy failed.');
    }
  };

  const markShared = async () => {
    const url = postUrl.trim();
    if (url && !isHttpUrl(url)) {
      setError('Post URL must start with http:// or https://.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await shareTool(tool.slug, venue, url);
      onToolChange(res.tool);
      setPostUrl('');
      setNotice(`Marked as shared on ${venue}.`);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  };

  const shared = [...(tool.sharedOn || [])].sort(byNewest);

  return (
    <div className="ait-card">
      <div className="ait-card-head">
        <h3>Share</h3>
        <button className="ait-linkish" type="button" onClick={() => setCaption(buildShareCaption(tool))}>
          Reset caption
        </button>
      </div>
      <label className="ait-fld full" style={{ marginTop: 0 }}>
        <span>Caption</span>
        <textarea rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </label>
      <div className="ait-actions" style={{ marginTop: 10 }}>
        <button className="ait-btn" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <select
          className="ait-select"
          aria-label="Venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        >
          {SHARE_VENUES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <input
          className="ait-input"
          type="url"
          aria-label="Post URL"
          placeholder="Post URL (optional)"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
        />
        <button className="ait-btn primary" type="button" disabled={busy} onClick={markShared}>
          {busy ? 'Marking…' : 'Mark shared'}
        </button>
      </div>
      {error && <p className="ait-error">{error}</p>}
      {notice && <p className="ait-notice">{notice}</p>}
      {shared.length ? (
        <ul className="ait-list" style={{ marginTop: 12 }}>
          {shared.map((s, i) => (
            <li key={`${s.at}-${i}`}>
              {s.venue} · {fmtDate(s.at)}
              {s.url && (
                <>
                  {' · '}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">link</a>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ait-hint">Not shared anywhere yet.</p>
      )}
    </div>
  );
};

export default ShareSection;
