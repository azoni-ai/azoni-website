import React, { useMemo, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import EpicSwimlane from '../components/board/EpicSwimlane';
import TaskEditorModal from '../components/board/TaskEditorModal';
import useBoardData from '../hooks/useBoardData';
import useGithubStats from '../hooks/useGithubStats';
import useOwnerAuth from '../hooks/useOwnerAuth';
import { boardWrite } from '../utils/boardApi';
import { projects } from '../data/projects';
import { SEED_TASKS, seedToTaskPayload } from '../data/boardSeed';
import {
  BOARD_COLUMNS,
  PHASE_META,
  deriveEpicPhase,
  epicActivityCounts,
} from '../utils/boardStatus';
import '../styles/board-warm.css';

const PHASE_WEIGHT = { active: 0, live: 1, maintained: 2, idle: 3 };

const resolveEpic = (id) => {
  if (id === '_meta') {
    return { id: '_meta', title: 'Portfolio', tagline: 'Cross-project & site work' };
  }
  const p = projects.find((proj) => proj.id === id);
  return p
    ? { id: p.id, title: p.title, tagline: p.tagline }
    : { id, title: id, tagline: '' };
};

export default function Board() {
  const { tasks, boardState, activity, loading } = useBoardData();
  const { githubStats } = useGithubStats();
  const { isOwner, token, login, logout, checking, error: authError } = useOwnerAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [editorTask, setEditorTask] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionError, setActionError] = useState('');
  const [importing, setImporting] = useState(false);
  const dragTask = useRef(null);

  const noRealTasks = !loading && tasks.length === 0;
  // Owner works with real tasks; visitors see starter cards on an empty board.
  const usingSeed = !isOwner && noRealTasks;
  const effectiveTasks = usingSeed ? SEED_TASKS : tasks;

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
      .map((id) => ({
        epic: resolveEpic(id),
        phase: deriveEpicPhase(id, githubStats, activity, phaseOverrides),
        counts: epicActivityCounts(id, githubStats, activity),
        tasks: byProject[id],
      }));

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

  // ── Owner actions ──
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
        setSaveError(err.message || 'Save failed');
        setSaving(false);
      }
    },
    [token]
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
        setSaveError(err.message || 'Delete failed');
        setSaving(false);
      }
    },
    [token]
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
    async (e, colId) => {
      const task = dragTask.current;
      const id = task?.id || e.dataTransfer?.getData('text/plain');
      if (!id) return;
      if (task && (task.status || 'backlog') === colId) return;
      setActionError('');
      try {
        await boardWrite(token, 'moveTask', { id, status: colId, order: Date.now() });
      } catch (err) {
        setActionError(err.message || 'Move failed');
      }
    },
    [token]
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
        setActionError(err.message || 'Phase update failed');
      }
    },
    [token]
  );

  const importSeed = useCallback(async () => {
    setImporting(true);
    setActionError('');
    try {
      for (const t of SEED_TASKS) {
        // sequential so ordering stays stable and we surface the first failure
        // eslint-disable-next-line no-await-in-loop
        await boardWrite(token, 'createTask', { task: seedToTaskPayload(t) });
      }
    } catch (err) {
      setActionError(`Import stopped: ${err.message || 'write failed'}`);
    } finally {
      setImporting(false);
    }
  }, [token]);

  const dragHandlers = { onDragStart: handleDragStart, onDragEnd: handleDragEnd };

  return (
    <Layout>
      <div className="board-page">
        <div className="board-page-inner">
          <header className="board-page-header">
            <div className="board-header-top">
              <div>
                <p className="board-eyebrow">Workflow</p>
                <h1 className="board-heading">Board</h1>
              </div>
              <div className="board-owner-controls">
                {isOwner ? (
                  <>
                    <span className="board-owner-badge">Owner</span>
                    {noRealTasks && (
                      <button
                        className="board-btn ghost"
                        onClick={importSeed}
                        disabled={importing}
                        title="Copy the GitHub-derived starter tasks into Firestore"
                      >
                        {importing ? 'Importing…' : `Import ${SEED_TASKS.length} starter tasks`}
                      </button>
                    )}
                    <button className="board-btn primary" onClick={() => openCreate()}>
                      + Add task
                    </button>
                    <button className="board-btn ghost" onClick={logout}>
                      Sign out
                    </button>
                  </>
                ) : showLogin ? (
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
                  <button className="board-btn ghost" onClick={() => setShowLogin(true)}>
                    Sign in to edit
                  </button>
                )}
              </div>
            </div>
            <p className="board-tagline">
              Every project is an epic, every agent an assignee. Card status is
              auto-derived from live commits and agent activity.
            </p>
          </header>

          <div className="board-legend">
            {Object.entries(PHASE_META).map(([key, meta]) => (
              <span key={key} className="board-legend-item">
                <span className="board-phase-dot" style={{ background: meta.color }} />
                {meta.label}
              </span>
            ))}
            {usingSeed && (
              <span className="board-sample-note">
                Starter tasks pulled from your GitHub — sign in to import &amp; manage them.
              </span>
            )}
            {actionError && <span className="board-login-error">{actionError}</span>}
          </div>

          <div className="board-grid board-columns-header">
            {BOARD_COLUMNS.map((col) => (
              <div key={col.id} className="board-col-header">
                {col.label}
              </div>
            ))}
          </div>

          {loading ? (
            <p className="board-loading">Loading board…</p>
          ) : epicsData.length === 0 ? (
            <div className="board-empty">
              <p>No tasks yet.</p>
              {isOwner && (
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
            epicsData.map(({ epic, phase, counts, tasks: epicTasks }) => (
              <EpicSwimlane
                key={epic.id}
                epic={epic}
                phase={phase}
                phaseOverride={phaseOverrides[epic.id]}
                counts={counts}
                tasks={epicTasks}
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
