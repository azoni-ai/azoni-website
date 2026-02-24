import React, { useEffect, useRef, useState } from 'react';

/**
 * AnimatedBeam — draws a glowing animated beam between two DOM elements.
 * Inspired by Magic UI. Works by measuring element positions relative to
 * a shared container and rendering an SVG path with animated gradient.
 */
const AnimatedBeam = ({
  containerRef,
  fromRef,
  toRef,
  color = '#ff7a5c',
  width = 2,
  curvature = 0,
  duration = 3,
  delay = 0,
  reverse = false,
  className = '',
  visible = true,
}) => {
  const pathRef = useRef(null);
  const [pathD, setPathD] = useState('');
  const gradientId = useRef(`beam-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef?.current || !fromRef?.current || !toRef?.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const fromRect = fromRef.current.getBoundingClientRect();
      const toRect = toRef.current.getBoundingClientRect();

      const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
      const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
      const toX = toRect.left - containerRect.left + toRect.width / 2;
      const toY = toRect.top - containerRect.top + toRect.height / 2;

      // Bezier control points for curved path
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      // Perpendicular offset for curvature
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const cpX = midX + nx * curvature;
      const cpY = midY + ny * curvature;

      const d = `M ${fromX},${fromY} Q ${cpX},${cpY} ${toX},${toY}`;
      setPathD(d);
    };

    updatePath();

    const observer = new ResizeObserver(updatePath);
    if (containerRef?.current) observer.observe(containerRef.current);

    window.addEventListener('resize', updatePath);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePath);
    };
  }, [containerRef, fromRef, toRef, curvature]);

  if (!pathD || !visible) return null;

  return (
    <svg
      className={`animated-beam-svg ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Static glow path */}
        <linearGradient id={`${gradientId.current}-static`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
          <stop offset="50%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>

        {/* Animated pulse gradient */}
        <linearGradient id={gradientId.current} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0">
            <animate
              attributeName="offset"
              values={reverse ? '1;0' : '0;1'}
              dur={`${duration}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="0%" stopColor={color} stopOpacity="0.8">
            <animate
              attributeName="offset"
              values={reverse ? '1;0' : '0;1'}
              dur={`${duration}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="10%" stopColor={color} stopOpacity="0.8">
            <animate
              attributeName="offset"
              values={reverse ? '1.1;0.1' : '0.1;1.1'}
              dur={`${duration}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="10%" stopColor={color} stopOpacity="0">
            <animate
              attributeName="offset"
              values={reverse ? '1.1;0.1' : '0.1;1.1'}
              dur={`${duration}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Static base path (subtle glow) */}
      <path
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId.current}-static)`}
        strokeWidth={width}
        strokeLinecap="round"
      />

      {/* Animated pulse traveling along path */}
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId.current})`}
        strokeWidth={width + 1}
        strokeLinecap="round"
        filter={`drop-shadow(0 0 ${width * 2}px ${color})`}
      />
    </svg>
  );
};

export default AnimatedBeam;
