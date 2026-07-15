import React, { useState, useRef } from 'react';
import TaskCard from './TaskCard';

function BoardColumn({ column, tasks, isOwner = false, onEditTask, onAdd, onDrop, dragHandlers }) {
  const [isOver, setIsOver] = useState(false);
  // dragenter/dragleave fire for every child element; a depth counter keeps
  // the highlight from strobing while dragging across cards inside the column.
  const depth = useRef(0);
  const { onDragStart, onDragEnd } = dragHandlers || {};

  const handleDragEnter = isOwner
    ? () => {
        depth.current += 1;
        setIsOver(true);
      }
    : undefined;
  const handleDragOver = isOwner ? (e) => e.preventDefault() : undefined;
  const handleDragLeave = isOwner
    ? () => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setIsOver(false);
      }
    : undefined;
  const handleDrop = isOwner
    ? (e) => {
        e.preventDefault();
        depth.current = 0;
        setIsOver(false);
        onDrop?.(e);
      }
    : undefined;

  return (
    <div
      className={`board-column${isOwner ? ' is-droppable' : ''}${isOver ? ' is-over' : ''}`}
      onDragEnter={handleDragEnter}
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

export default React.memo(BoardColumn);
