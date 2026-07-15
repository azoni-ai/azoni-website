import React from 'react';
import { avatars, AGENTS } from '../../data/agents';
import { toMs, timeAgo } from '../../utils/boardStatus';

const PRIORITY_META = {
  high: { label: 'High', color: '#f87171' },
  med: { label: 'Med', color: '#d9a05b' },
  low: { label: 'Low', color: '#8ba888' },
};

export function AgentChip({ agentKey, size = 20, className = '' }) {
  const render = avatars[agentKey];
  if (!render) return null;
  const agent = AGENTS[agentKey];
  const name = agent?.name || agentKey;
  return (
    <span
      className={`board-agent-chip ${className}`}
      title={name}
      role="img"
      aria-label={name}
      style={{ borderColor: agent?.color || 'var(--border-warm-strong)' }}
    >
      {render(size)}
    </span>
  );
}

// Only http(s) links get an anchor; anything else renders as plain text.
const safeLink = (link) => (/^https?:\/\//i.test(link || '') ? link : null);

// Label for the footer link: explicit source label, else the link's host.
const linkLabel = (task) => {
  if (task.source) return task.source;
  try {
    return new URL(task.link).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
};

function TaskCard({ task, isOwner = false, onEdit, onDragStart, onDragEnd }) {
  const priority = task.priority ? PRIORITY_META[task.priority] : null;
  const href = safeLink(task.link);
  const updatedMs = toMs(task.updatedAt);

  const activate = (e) => {
    e.preventDefault();
    onEdit?.(task);
  };

  return (
    <article
      className={`board-task${isOwner ? ' is-draggable' : ''}${task.isSeed ? ' is-seed' : ''}${
        task.visibility === 'private' ? ' is-private' : ''
      }`}
      draggable={isOwner}
      onDragStart={
        isOwner
          ? (e) => {
              e.currentTarget.classList.add('is-dragging');
              onDragStart?.(e, task);
            }
          : undefined
      }
      onDragEnd={
        isOwner
          ? (e) => {
              e.currentTarget.classList.remove('is-dragging');
              onDragEnd?.(e);
            }
          : undefined
      }
      onClick={isOwner ? () => onEdit?.(task) : undefined}
      role={isOwner ? 'button' : undefined}
      tabIndex={isOwner ? 0 : undefined}
      onKeyDown={
        isOwner
          ? (e) => {
              // Ignore keys bubbling from the footer link — Enter there
              // must navigate, not open the editor.
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') activate(e);
            }
          : undefined
      }
    >
      <div className="board-task-top">
        <h4 className="board-task-title">
          {task.visibility === 'private' && (
            <span className="board-private-mark" title="Hidden from the public board" aria-hidden="true">
              🔒{' '}
            </span>
          )}
          {task.title}
        </h4>
        {priority && (
          <span
            className="board-priority-chip"
            style={{ color: priority.color, borderColor: `${priority.color}55` }}
          >
            {priority.label}
          </span>
        )}
      </div>
      {task.description && <p className="board-task-desc">{task.description}</p>}
      <div className="board-task-foot">
        <div className="board-agent-chips">
          {(task.agentIds || []).map((a) => (
            <AgentChip key={a} agentKey={a} size={18} className="sm" />
          ))}
        </div>
        <span className="board-task-foot-right">
          {href ? (
            <a
              className="board-task-source"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={href}
            >
              {linkLabel(task)} ↗
            </a>
          ) : (
            task.source && <span className="board-task-source">{task.source}</span>
          )}
          {updatedMs > 0 && (
            <span
              className="board-task-time"
              title={new Date(updatedMs).toLocaleString()}
            >
              {timeAgo(updatedMs)}
            </span>
          )}
        </span>
      </div>
    </article>
  );
}

export default React.memo(TaskCard);
