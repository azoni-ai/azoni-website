import { useState, useEffect, useCallback, useRef } from 'react';
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS, BUILDINGS, buildCollisionMap } from './townLayout';

const MOVE_SPEED = 120; // ms per tile

export default function usePlayerMovement(startX, startY) {
  const [pos, setPos] = useState({ x: startX, y: startY });
  const [dir, setDir] = useState('down'); // up, down, left, right
  const [isMoving, setIsMoving] = useState(false);
  const [reachedBuilding, setReachedBuilding] = useState(null);
  const collisionMap = useRef(null);
  const movingRef = useRef(false);

  // Build collision map once
  useEffect(() => {
    collisionMap.current = buildCollisionMap();
  }, []);

  const canMove = useCallback((x, y) => {
    if (x < 0 || x >= WORLD_COLS || y < 0 || y >= WORLD_ROWS) return false;
    return collisionMap.current?.[y]?.[x] !== false;
  }, []);

  // Check if player is at a building entrance
  const checkBuildingEntrance = useCallback((x, y) => {
    for (const b of BUILDINGS) {
      if (b.entrance.x === x && b.entrance.y === y) {
        return b.id;
      }
    }
    return null;
  }, []);

  // Process one step
  const step = useCallback((dx, dy) => {
    setPos(prev => {
      const nx = prev.x + dx;
      const ny = prev.y + dy;
      if (!canMove(nx, ny)) return prev;

      // Set direction
      if (dx > 0) setDir('right');
      else if (dx < 0) setDir('left');
      else if (dy > 0) setDir('down');
      else if (dy < 0) setDir('up');

      // Check building entrance
      const building = checkBuildingEntrance(nx, ny);
      if (building) setReachedBuilding(building);

      return { x: nx, y: ny };
    });
  }, [canMove, checkBuildingEntrance]);

  // Keyboard movement
  useEffect(() => {
    const keys = new Set();
    let interval = null;

    const processKeys = () => {
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) step(0, -1);
      else if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) step(0, 1);
      else if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) step(-1, 0);
      else if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) step(1, 0);
    };

    const onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
        if (!keys.has(e.key)) {
          keys.add(e.key);
          processKeys(); // Move immediately on first press
          if (!interval) {
            interval = setInterval(processKeys, MOVE_SPEED);
          }
          setIsMoving(true);
        }
      }
    };

    const onKeyUp = (e) => {
      keys.delete(e.key);
      if (keys.size === 0) {
        clearInterval(interval);
        interval = null;
        setIsMoving(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, [step]);

  // Click-to-move: walk to tile
  const moveTo = useCallback((targetX, targetY) => {
    if (!canMove(targetX, targetY)) return;
    setReachedBuilding(null);

    // Simple walk: move x first, then y
    const walkSteps = [];
    let cx = pos.x, cy = pos.y;

    while (cx !== targetX) {
      const dx = cx < targetX ? 1 : -1;
      if (canMove(cx + dx, cy)) {
        cx += dx;
        walkSteps.push({ x: cx, y: cy, dir: dx > 0 ? 'right' : 'left' });
      } else break;
    }
    while (cy !== targetY) {
      const dy = cy < targetY ? 1 : -1;
      if (canMove(cx, cy + dy)) {
        cy += dy;
        walkSteps.push({ x: cx, y: cy, dir: dy > 0 ? 'down' : 'up' });
      } else break;
    }

    if (walkSteps.length === 0) return;

    movingRef.current = true;
    setIsMoving(true);
    let i = 0;
    const walkInterval = setInterval(() => {
      if (i >= walkSteps.length) {
        clearInterval(walkInterval);
        movingRef.current = false;
        setIsMoving(false);
        // Check building at destination
        const building = checkBuildingEntrance(walkSteps[walkSteps.length - 1].x, walkSteps[walkSteps.length - 1].y);
        if (building) setReachedBuilding(building);
        return;
      }
      const s = walkSteps[i];
      setPos({ x: s.x, y: s.y });
      setDir(s.dir);
      i++;
    }, MOVE_SPEED);
  }, [pos, canMove, checkBuildingEntrance]);

  const clearReachedBuilding = useCallback(() => setReachedBuilding(null), []);

  return {
    pos,
    dir,
    isMoving,
    reachedBuilding,
    clearReachedBuilding,
    moveTo,
    pixelPos: { x: pos.x * TILE_SIZE, y: pos.y * TILE_SIZE },
  };
}
