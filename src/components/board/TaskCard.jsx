import React from 'react';
import { avatars, AGENTS } from '../../data/agents';

const PRIORITY_META = {
  high: { label: 'High', color: '#f87171' },
  med: { label: 'Medium', color: '#d9a05b' },
  low: { label: 'Low', color: '#8ba888' },
};

export function AgentChip({ agentKey, size = 20, className = '' }) {
  const render = avatars[agentKey];
  if (!render) return null;
  const agent = AGENTS[agentKey];
  return (
    <span
      className={`board-agent-chip ${className}`}
      title={agent?.name || agentKey}
      style={{ borderColor: agent?.color || 'var(--border-warm-strong)' }}
    >
      {render(size)}
    </span>
  );
}

export default function TaskCard({
  task,
  isOwner = false,
  onEdit,
  onDragStart,
  onDragEnd,
}) {
  const priority = task.priority ? PRIORITY_META[task.priority] : null;

  return (
    <article
      className={`board-task${isOwner ? ' is-draggable' : ''}${task.isSeed ? ' is-seed' : ''}`}
      draggable={isOwner}
      onDragStart={isOwner ? (e) => onDragStart?.(e, task) : undefined}
      onDragEnd={isOwner ? onDragEnd : undefined}
      onClick={isOwner ? () => onEdit?.(task) : undefined}
      role={isOwner ? 'button' : undefined}
      tabIndex={isOwner ? 0 : undefined}
      onKeyDown={
        isOwner
          ? (e) => {
              if (e.key === 'Enter') onEdit?.(task);
            }
          : undefined
      }
    >
      <div className="board-task-top">
        <h4 className="board-task-title">{task.title}</h4>
        {priority && (
          <span
            className="board-priority-dot"
            style={{ background: priority.color }}
            title={`${priority.label} priority`}
          />
        )}
      </div>
      {task.description && <p className="board-task-desc">{task.description}</p>}
      <div className="board-task-foot">
        <div className="board-agent-chips">
          {(task.agentIds || []).map((a) => (
            <AgentChip key={a} agentKey={a} size={18} className="sm" />
          ))}
        </div>
        {task.source &&
          (task.link ? (
            <a
              className="board-task-source"
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={task.link}
            >
              {task.source} ↗
            </a>
          ) : (
            <span className="board-task-source">{task.source}</span>
          ))}
      </div>
    </article>
  );
}
