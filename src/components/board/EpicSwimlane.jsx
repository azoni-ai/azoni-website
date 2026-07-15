import React from 'react';
import { Link } from 'react-router-dom';
import { AgentChip } from './TaskCard';
import BoardColumn from './BoardColumn';
import { BOARD_COLUMNS, PHASE_META, PROJECT_TO_AGENTS } from '../../utils/boardStatus';

const PHASE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'active', label: 'Active' },
  { value: 'live', label: 'Live' },
  { value: 'maintained', label: 'Maintained' },
  { value: 'idle', label: 'Idle' },
];

function EpicSwimlane({
  epic,
  phase,
  phaseOverride,
  counts,
  tasks,
  collapsed = false,
  onToggleCollapse,
  isOwner = false,
  onEditTask,
  onAddTask,
  onSetPhase,
  onDropTask,
  dragHandlers,
}) {
  const phaseMeta = PHASE_META[phase] || PHASE_META.idle;
  const agentKeys =
    epic.id === '_meta' ? ['orchestrator'] : PROJECT_TO_AGENTS[epic.id] || [];

  const tasksInColumn = (status) =>
    tasks.filter((t) => (t.status || 'backlog') === status);

  const inFlight = tasks.filter((t) =>
    ['in_progress', 'review'].includes(t.status || 'backlog')
  ).length;

  return (
    <section className={`board-epic${collapsed ? ' is-collapsed' : ''}`}>
      <header className="board-epic-head">
        <div className="board-epic-title-row">
          <button
            type="button"
            className="board-epic-toggle"
            onClick={() => onToggleCollapse?.(epic.id, collapsed)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${epic.title}`}
          >
            <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          </button>
          <h3 className="board-epic-title">
            {epic.hasPage ? (
              <Link to={`/projects/${epic.id}`} className="board-epic-link">
                {epic.title}
              </Link>
            ) : (
              epic.title
            )}
          </h3>
          <span
            className="board-phase-chip"
            style={{ color: phaseMeta.color, borderColor: `${phaseMeta.color}55` }}
          >
            <span className="board-phase-dot" style={{ background: phaseMeta.color }} />
            {phaseMeta.label}
          </span>
          {isOwner && (
            <select
              className="board-phase-select"
              value={phaseOverride || 'auto'}
              onChange={(e) => onSetPhase?.(epic.id, e.target.value)}
              title="Override phase (Auto = derived from activity)"
            >
              {PHASE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {agentKeys.length > 0 && (
            <div className="board-epic-agents">
              {agentKeys.map((a) => (
                <AgentChip key={a} agentKey={a} size={18} className="sm" />
              ))}
            </div>
          )}
          {collapsed && (
            <span className="board-epic-collapsed-summary">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
              {inFlight > 0 && ` · ${inFlight} in flight`}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="board-epic-meta">
            {epic.tagline && <span className="board-epic-tagline">{epic.tagline}</span>}
            <span className="board-epic-counts">
              {counts.commits > 0 && (
                <span title="commits this week">
                  {counts.commits} commit{counts.commits === 1 ? '' : 's'}
                </span>
              )}
              {counts.commits > 0 && counts.actions > 0 && (
                <span className="board-dot-sep">·</span>
              )}
              {counts.actions > 0 && (
                <span title="agent actions this week">
                  {counts.actions} action{counts.actions === 1 ? '' : 's'}
                </span>
              )}
              {counts.commits === 0 && counts.actions === 0 && (
                <span className="board-epic-quiet">quiet this week</span>
              )}
            </span>
          </div>
        )}
      </header>

      {!collapsed && (
        <div className="board-grid board-epic-columns">
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={tasksInColumn(col.id)}
              isOwner={isOwner}
              onEditTask={onEditTask}
              onAdd={() => onAddTask?.(epic.id, col.id)}
              onDrop={(e) => onDropTask?.(e, col.id, epic.id)}
              dragHandlers={dragHandlers}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default React.memo(EpicSwimlane);
