import React, { useMemo, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import HubTotalsBar from '../components/hub/HubTotalsBar';
import SiteCard from '../components/hub/SiteCard';
import HubCalendar from '../components/hub/HubCalendar';
import SiteEditorModal from '../components/hub/SiteEditorModal';
import useHubSummary from '../hooks/useHubSummary';
import useOwnerAuth from '../hooks/useOwnerAuth';
import { hubWrite } from '../utils/hubApi';
import '../styles/board-warm.css'; // shared owner buttons / login / modal styles
import '../styles/hub-warm.css';

const GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'flagship', label: 'Flagship' },
  { id: 'launchpad', label: 'Launchpad' },
  { id: 'infra', label: 'Infra' },
];

const needsAttention = (site) =>
  site.health?.status === 'down' ||
  site.health?.status === 'degraded' ||
  Object.values(site.content || {}).some((c) => c.status === 'stale' || c.status === 'due');

export default function Hub() {
  const { summary, refresh } = useHubSummary();
  const { isOwner, token, login, logout, invalidate, checking, error: authError } = useOwnerAuth();

  const [group, setGroup] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [editorSite, setEditorSite] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionError, setActionError] = useState('');
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [liveHealth, setLiveHealth] = useState(null); // siteId -> live probe result

  const loading = summary == null;
  const sites = useMemo(() => {
    let list = summary?.sites || [];
    if (liveHealth) {
      list = list.map((s) =>
        liveHealth[s.id]
          ? { ...s, health: { ...(s.health || {}), ...liveHealth[s.id], checkedAt: liveHealth[s.id].checkedAt } }
          : s
      );
    }
    if (group !== 'all') list = list.filter((s) => s.group === group);
    if (attentionOnly) list = list.filter(needsAttention);
    return [...list].sort((a, b) => {
      const aa = needsAttention(a) ? 0 : 1;
      const ba = needsAttention(b) ? 0 : 1;
      if (aa !== ba) return aa - ba;
      return (b.traffic?.d7 || 0) - (a.traffic?.d7 || 0);
    });
  }, [summary, group, attentionOnly, liveHealth]);

  const handle401 = useCallback(
    (err) => {
      if (err?.status === 401) {
        invalidate();
        setShowLogin(true);
        return 'Session expired — please sign in again.';
      }
      return null;
    },
    [invalidate]
  );

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(password);
    if (ok) {
      setShowLogin(false);
      setPassword('');
    }
  };

  const saveSiteState = useCallback(
    async (siteId, state) => {
      setSaving(true);
      setSaveError('');
      try {
        await hubWrite(token, 'setSiteState', { siteId, state });
        setSaving(false);
        setEditorSite(null);
        refresh(); // cache was dropped server-side; pull the rebuilt summary
      } catch (err) {
        setSaveError(handle401(err) || err.message || 'Save failed');
        setSaving(false);
      }
    },
    [token, refresh, handle401]
  );

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    setActionError('');
    try {
      const { results } = await hubWrite(token, 'checkHealth');
      const map = {};
      (results || []).forEach((r) => { map[r.siteId] = r; });
      setLiveHealth(map);
    } catch (err) {
      setActionError(handle401(err) || err.message || 'Health check failed');
    } finally {
      setCheckingHealth(false);
    }
  }, [token, handle401]);

  return (
    <Layout>
      <div className="hub-page">
        <div className="hub-page-inner">
          <header className="hub-page-header">
            <div className="hub-header-top">
              <div>
                <p className="hub-eyebrow">Mission Control</p>
                <h1 className="hub-heading">Hub</h1>
              </div>
              {isOwner && (
                <div className="hub-owner-controls">
                  <span className="board-owner-badge">Owner</span>
                  <button
                    className="board-btn ghost"
                    onClick={checkHealth}
                    disabled={checkingHealth}
                  >
                    {checkingHealth ? 'Checking…' : 'Check health now'}
                  </button>
                  <button className="board-btn ghost" onClick={logout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
            <p className="hub-tagline">
              Every site, agent, and app in the ecosystem — health, traffic, costs, open work,
              and content cadence in one place. Each site keeps its own composer; this page
              tracks what shipped where, and what&rsquo;s overdue.
            </p>
          </header>

          <HubTotalsBar totals={summary?.totals} updatedAt={summary?.updatedAt} />

          <div className="hub-filters">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`hub-pill${group === g.id ? ' is-active' : ''}`}
                onClick={() => setGroup(g.id)}
                aria-pressed={group === g.id}
              >
                {g.label}
              </button>
            ))}
            <button
              type="button"
              className={`hub-pill hub-pill-attention${attentionOnly ? ' is-active' : ''}`}
              onClick={() => setAttentionOnly((v) => !v)}
              aria-pressed={attentionOnly}
            >
              Needs attention
            </button>
            {actionError && <span className="board-login-error">{actionError}</span>}
            {!isOwner &&
              (showLogin ? (
                <form className="board-login hub-login" onSubmit={handleLoginSubmit}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Owner password"
                    autoFocus
                  />
                  <button className="board-btn primary" type="submit" disabled={checking}>
                    {checking ? '…' : 'Sign in'}
                  </button>
                  <button className="board-btn ghost" type="button" onClick={() => setShowLogin(false)}>
                    Cancel
                  </button>
                  {authError && <span className="board-login-error">{authError}</span>}
                </form>
              ) : (
                <button type="button" className="board-signin-link" onClick={() => setShowLogin(true)}>
                  owner sign-in
                </button>
              ))}
          </div>

          {loading ? (
            <p className="hub-loading">Loading mission control…</p>
          ) : sites.length === 0 ? (
            <p className="hub-loading">
              {attentionOnly ? 'Nothing needs attention — all clear.' : 'No site data yet.'}
            </p>
          ) : (
            <div className="hub-grid">
              {sites.map((site) => (
                <SiteCard key={site.id} site={site} isOwner={isOwner} onEdit={setEditorSite} />
              ))}
            </div>
          )}

          <HubCalendar
            calendar={summary?.calendar || []}
            sites={summary?.sites || []}
            calendarDays={summary?.calendarDays || 45}
          />
        </div>
      </div>

      <AnimatePresence>
        {editorSite && (
          <SiteEditorModal
            site={editorSite}
            onClose={() => {
              setEditorSite(null);
              setSaveError('');
            }}
            onSave={saveSiteState}
            saving={saving}
            error={saveError}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
