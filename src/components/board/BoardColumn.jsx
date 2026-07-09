import React, { useState } from 'react';
import TaskCard from './TaskCard';

export default function BoardColumn({
  column,
  tasks,
  isOwner = false,
  onEditTask,
  onAdd,
  onDrop,
  dragHandlers,
}) {
  const [isOver, setIsOver] = useState(false);
  const { onDragStart, onDragEnd } = dragHandlers || {};

  const handleDragOver = isOwner
    ? (e) => {
        e.preventDefault();
        if (!isOver) setIsOver(true);
      }
    : undefined;
  const handleDragLeave = isOwner ? () => setIsOver(false) : undefined;
  const handleDrop = isOwner
    ? (e) => {
        e.preventDefault();
        setIsOver(false);
        onDrop?.(e);
      }
    : undefined;

  return (
    <div
      className={`board-column${isOwner ? ' is-droppable' : ''}${isOver ? ' is-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="board-column-head">
        <span className="board-column-label">{column.label}</span>
        <span className="board-column-head-right">
          {isOwner && (
            <button
              type="button"
              className="board-add-mini"
              onClick={() => onAdd?.()}
              aria-label={`Add task to ${column.label}`}
              title={`Add task to ${column.label}`}
            >
              +
            </button>
          )}
          <span className="board-column-count">{tasks.length}</span>
        </span>
      </div>
      <div className="board-column-body">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            isOwner={isOwner}
            onEdit={onEditTask}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {tasks.length === 0 && <div className="board-column-empty">—</div>}
      </div>
    </div>
  );
}
