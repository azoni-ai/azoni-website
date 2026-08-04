import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import Seo from '../components/Seo';
import EpicSwimlane from '../components/board/EpicSwimlane';
import TaskEditorModal from '../components/board/TaskEditorModal';
import useBoardData from '../hooks/useBoardData';
import useGithubStats from '../hooks/useGithubStats';
import useOwnerAuth from '../hooks/useOwnerAuth';
import { boardWrite } from '../utils/boardApi';
import { projects } from '../data/projects';
import { SEED_TASKS, seedToTaskPayload } from '../data/boardSeed';
import {
  PHASE_META,
  deriveEpicPhase,
  epicActivityCounts,
  toMs,
  timeAgo,
} from '../utils/boardStatus';
import '../styles/board-warm.css';

const PHASE_WEIGHT = { active: 0, live: 1, maintained: 2, idle: 3 };
const COLLAPSE_KEY = 'board_collapsed_epics';

const resolveEpic = (id) => {
  if (id === '_meta') {
    return { id: '_meta', title: 'Portfolio', tagline: 'Cross-project & site work', hasPage: false };
  }
  const p = projects.find((proj) => proj.id === id);
  return p
    ? { id: p.id, title: p.title, tagline: p.tagline, hasPage: true }
    : { id, title: id, tagline: '', hasPage: false };
};

const readCollapseMap = () => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {};
  } catch {
    return {};
  }
};

export default function Board() {
  const { isOwner, token, login, logout, invalidate, checking, error: authError } = useOwnerAuth();
  // Visitors get one-shot reads; realtime listeners are owner-only (quota).
  const { tasks, boardState, activity, loading } = useBoardData(isOwner);
  const { githubStats, loading: ghLoading } = useGithubStats();

  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [editorTask, setEditorTask] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionError, setActionError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFailed, setImportFailed] = useState(false);
  // Default lens: only actively-worked projects. Falls back to all (below)
  // if nothing derives as active once the data lands.
  const [phaseFilter, setPhaseFilter] = useState('active');
  const [filterTouched, setFilterTouched] = useState(false);
  const [collapseMap, setCollapseMap] = useState(readCollapseMap);
  const dragTask = useRef(null);

  const noRealTasks = !loading && tasks.length === 0;
  // Owner works with real tasks; visitors see starter cards on an empty board.
  const usingSeed = !isOwner && noRealTasks;
  const effectiveTasks = useMemo(() => {
    const base = usingSeed ? SEED_TASKS : tasks;
    // "Private" tasks never render for visitors.
    return isOwner ? base : base.filter((t) => t.visibility !== 'private');
  }, [usingSeed, tasks, isOwner]);

  const phaseOverrides = useMemo(() => boardState.phaseOverrides || {}, [boardState]);

  const epicsData = useMemo(() => {
    const byProject = {};
    effectiveTasks.forEach((t) => {
      const pid = t.projectId || '_meta';
      (byProject[pid] = byProject[pid] || []).push(t);
    });

    const hidden = new Set(boardState.hiddenProjects || []);
    const epicOrder = boardState.epicOrder || [];
    const orderIndex = (id) => {
      const i = epicOrder.indexOf(id);
      return i === -1 ? Infinity : i;
    };

    const built = Object.keys(byProject)
      .filter((id) => !hidden.has(id))
      .map((id) => {
        const epicTasks = byProject[id];
        const latestTaskMs = epicTasks.reduce((m, t) => Math.max(m, toMs(t.updatedAt)), 0);
        return {
          epic: resolveEpic(id),
          phase: deriveEpicPhase(id, githubStats, activity, phaseOverrides, latestTaskMs),
          counts: epicActivityCounts(id, githubStats, activity),
          tasks: epicTasks,
        };
      });

    built.sort((a, b) => {
      const oa = orderIndex(a.epic.id);
      const ob = orderIndex(b.epic.id);
      if (oa !== ob) return oa - ob;
      const pa = PHASE_WEIGHT[a.phase] ?? 9;
      const pb = PHASE_WEIGHT[b.phase] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.epic.title.localeCompare(b.epic.title);
    });

    return built;
  }, [effectiveTasks, boardState, githubStats, activity, phaseOverrides]);

  const visibleEpics = useMemo(
    () => (phaseFilter ? epicsData.filter((e) => e.phase === phaseFilter) : epicsData),
    [epicsData, phaseFilter]
  );

  // Board-level freshness: newest task edit. Computed from the tasks that
  // are actually shown, so a private edit never leaks its timestamp.
  const lastUpdatedMs = useMemo(
    () => (usingSeed ? 0 : effectiveTasks.reduce((m, t) => Math.max(m, toMs(t.updatedAt)), 0)),
    [effectiveTasks, usingSeed]
  );
  const inFlightCount = useMemo(
    () =>
      effectiveTasks.filter((t) => ['in_progress', 'review'].includes(t.status || 'backlog'))
        .length,
    [effectiveTasks]
  );

  // Quiet (idle) epics start collapsed; explicit toggles win and persist.
  const isCollapsed = useCallback(
    (epicId, phase) => collapseMap[epicId] ?? phase === 'idle',
    [collapseMap]
  );
  const toggleCollapse = useCallback((epicId, currentlyCollapsed) => {
    setCollapseMap((prev) => {
      const next = { ...prev, [epicId]: !currentlyCollapsed };
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* private mode etc. */
      }
      return next;
    });
  }, []);

  // ── Owner actions ──
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

  const openCreate = useCallback((projectId = '_meta', status = 'backlog') => {
    setSaveError('');
    setEditorTask({ projectId, status, agentIds: [], priority: '', visibility: 'public' });
  }, []);

  const openEdit = useCallback((task) => {
    setSaveError('');
    setEditorTask(task);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorTask(null);
    setSaveError('');
  }, []);

  const saveTask = useCallback(
    async (fields, id) => {
      setSaving(true);
      setSaveError('');
      try {
        if (id) {
          await boardWrite(token, 'updateTask', { id, task: fields });
        } else {
          await boardWrite(token, 'createTask', { task: fields });
        }
        setSaving(false);
        setEditorTask(null);
      } catch (err) {
        setSaveError(handle401(err) || err.message || 'Save failed');
        setSaving(false);
      }
    },
    [token, handle401]
  );

  const deleteTask = useCallback(
    async (id) => {
      setSaving(true);
      setSaveError('');
      try {
        await boardWrite(token, 'deleteTask', { id });
        setSaving(false);
        setEditorTask(null);
      } catch (err) {
        setSaveError(handle401(err) || err.message || 'Delete failed');
        setSaving(false);
      }
    },
    [token, handle401]
  );

  const handleDragStart = useCallback((e, task) => {
    dragTask.current = task;
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', task.id);
    } catch {
      /* some browsers require a set; ignore failures */
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    dragTask.current = null;
  }, []);

  const handleDropTask = useCallback(
    async (e, colId, epicId) => {
      const task = dragTask.current;
      const id = task?.id || e.dataTransfer?.getData('text/plain');
      // Guard the dataTransfer fallback: stray drags (selected text, URLs)
      // put arbitrary strings in text/plain — never send those as doc ids.
      if (!id || !/^[\w-]{1,80}$/.test(id)) return;
      const sameStatus = task && (task.status || 'backlog') === colId;
      const sameEpic = task ? (task.projectId || '_meta') === epicId : false;
      if (sameStatus && sameEpic) return;
      setActionError('');
      try {
        const payload = { id, status: colId, order: Date.now() };
        // Dropping into another swimlane also re-files the task under that
        // epic (re-filing into its own epic is a harmless no-op).
        if (!sameEpic && epicId) payload.projectId = epicId;
        await boardWrite(token, 'moveTask', payload);
      } catch (err) {
        setActionError(handle401(err) || err.message || 'Move failed');
      }
    },
    [token, handle401]
  );

  const setPhase = useCallback(
    async (projectId, value) => {
      setActionError('');
      try {
        await boardWrite(token, 'setPhaseOverride', {
          projectId,
          phase: value === 'auto' ? null : value,
        });
      } catch (err) {
        setActionError(handle401(err) || err.message || 'Phase update failed');
      }
    },
    [token, handle401]
  );

  const importSeed = useCallback(async () => {
    setImporting(true);
    setActionError('');
    try {
      for (const t of SEED_TASKS) {
        // sequential so ordering stays stable and we surface the first failure;
        // seedId makes each write idempotent, so a retry never duplicates.
        // eslint-disable-next-line no-await-in-loop
        await boardWrite(token, 'createTask', { task: seedToTaskPayload(t) });
      }
      setImportFailed(false);
    } catch (err) {
      // Keep the button around for a retry — the first successful write
      // flips noRealTasks, which would otherwise unmount it mid-failure.
      setImportFailed(true);
      setActionError(handle401(err) || `Import stopped: ${err.message || 'write failed'}`);
    } finally {
      setImporting(false);
    }
  }, [token, handle401]);

  const dragHandlers = useMemo(
    () => ({ onDragStart: handleDragStart, onDragEnd: handleDragEnd }),
    [handleDragStart, handleDragEnd]
  );

  // The default "Active" lens falls back to all projects once the data has
  // fully landed and nothing derives as active. Runs only until the user
  // touches the filter themselves — their explicit choices (including an
  // empty result + "Show all" button) are never overridden.
  useEffect(() => {
    if (filterTouched || loading || ghLoading) return;
    if (phaseFilter === 'active' && epicsData.length > 0 && !epicsData.some((e) => e.phase === 'active')) {
      setPhaseFilter(null);
    }
  }, [filterTouched, loading, ghLoading, phaseFilter, epicsData]);

  return (
    <Layout>
      <Seo
        title="Board"
        description="A kanban board of my projects. Every project is an epic, built from GitHub activity."
        path="/board"
        noIndex
      />
      <div className="board-page">
        <div className="board-page-inner">
          <header className="board-page-header">
            <div className="board-header-top">
              <div>
                <p className="board-eyebrow">Workflow</p>
                <h1 className="board-heading">Board</h1>
              </div>
              {isOwner && (
                <div className="board-owner-controls">
                  <span className="board-owner-badge">Owner</span>
                  {(noRealTasks || importFailed) && (
                    <button
                      className="board-btn ghost"
                      onClick={importSeed}
                      disabled={importing}
                      title="Copy the GitHub-derived starter tasks into Firestore (safe to re-run)"
                    >
                      {importing
                        ? 'Importing…'
                        : importFailed
                          ? 'Retry starter-task import'
                          : `Import ${SEED_TASKS.length} starter tasks`}
                    </button>
                  )}
                  <button className="board-btn primary" onClick={() => openCreate()}>
                    + Add task
                  </button>
                  <button className="board-btn ghost" onClick={logout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
            <p className="board-tagline">
              The kanban board behind everything on this site. Every project is an epic and every
              agent an assignee, and each project&rsquo;s phase comes from commits and agent activity.
            </p>
            <p className="board-summary">
              {visibleEpics.length} project{visibleEpics.length === 1 ? '' : 's'}
              <span className="board-dot-sep">·</span>
              {effectiveTasks.length} task{effectiveTasks.length === 1 ? '' : 's'}
              {inFlightCount > 0 && (
                <>
                  <span className="board-dot-sep">·</span>
                  {inFlightCount} in flight
                </>
              )}
              {lastUpdatedMs > 0 && (
                <>
                  <span className="board-dot-sep">·</span>
                  updated {timeAgo(lastUpdatedMs)} ago
                </>
              )}
            </p>
          </header>

          <div className="board-legend">
            {Object.entries(PHASE_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                className={`board-legend-item${phaseFilter === key ? ' is-active' : ''}`}
                onClick={() => {
                  setFilterTouched(true);
                  setPhaseFilter((cur) => (cur === key ? null : key));
                }}
                aria-pressed={phaseFilter === key}
                title={
                  phaseFilter === key
                    ? 'Show all projects'
                    : `Show only ${meta.label.toLowerCase()} projects`
                }
              >
                <span className="board-phase-dot" style={{ background: meta.color }} />
                {meta.label}
              </button>
            ))}
            {usingSeed && (
              <span className="board-sample-note">
                Example cards based on GitHub activity. Live tasks appear here once they&rsquo;re filed.
              </span>
            )}
            {actionError && <span className="board-login-error">{actionError}</span>}
            {!isOwner &&
              (showLogin ? (
                <form className="board-login" onSubmit={handleLoginSubmit}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Board password"
                    autoFocus
                  />
                  <button className="board-btn primary" type="submit" disabled={checking}>
                    {checking ? '…' : 'Sign in'}
                  </button>
                  <button
                    className="board-btn ghost"
                    type="button"
                    onClick={() => setShowLogin(false)}
                  >
                    Cancel
                  </button>
                  {authError && <span className="board-login-error">{authError}</span>}
                </form>
              ) : (
                <button
                  type="button"
                  className="board-signin-link"
                  onClick={() => setShowLogin(true)}
                >
                  owner sign-in
                </button>
              ))}
          </div>

          {loading ? (
            <p className="board-loading">Loading board…</p>
          ) : visibleEpics.length === 0 ? (
            <div className="board-empty">
              <p>{phaseFilter ? 'No projects in this phase right now.' : 'No tasks yet.'}</p>
              {phaseFilter && (
                <button
                  className="board-btn ghost"
                  onClick={() => {
                    setFilterTouched(true);
                    setPhaseFilter(null);
                  }}
                >
                  Show all projects
                </button>
              )}
              {isOwner && !phaseFilter && (
                <div className="board-empty-actions">
                  <button
                    className="board-btn primary"
                    onClick={importSeed}
                    disabled={importing}
                  >
                    {importing ? 'Importing…' : `Import ${SEED_TASKS.length} starter tasks from GitHub`}
                  </button>
                  <button className="board-btn ghost" onClick={() => openCreate()}>
                    + Add one manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            visibleEpics.map(({ epic, phase, counts, tasks: epicTasks }) => (
              <EpicSwimlane
                key={epic.id}
                epic={epic}
                phase={phase}
                phaseOverride={phaseOverrides[epic.id]}
                counts={counts}
                tasks={epicTasks}
                collapsed={isCollapsed(epic.id, phase)}
                onToggleCollapse={toggleCollapse}
                isOwner={isOwner}
                onEditTask={openEdit}
                onAddTask={openCreate}
                onSetPhase={setPhase}
                onDropTask={handleDropTask}
                dragHandlers={dragHandlers}
              />
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {editorTask && (
          <TaskEditorModal
            task={editorTask}
            onClose={closeEditor}
            onSave={saveTask}
            onDelete={deleteTask}
            saving={saving}
            error={saveError}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
