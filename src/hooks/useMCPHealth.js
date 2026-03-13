import { useState, useEffect, useCallback } from 'react';
import { MCP_URL } from '../utils/station-mapping';

export function useMCPHealth() {
  const [health, setHealth] = useState(null);
  const [toolCounts, setToolCounts] = useState({});
  const [totalTools, setTotalTools] = useState(0);

  const refresh = useCallback(() => {
    return Promise.all([
      fetch(`${MCP_URL}/health`).then(r => r.json()).catch(() => null),
      fetch(`${MCP_URL}/tools`).then(r => r.json()).catch(() => null),
    ]).then(([h, tools]) => {
      setHealth(h);
      if (tools?.tools) {
        const counts = {};
        tools.tools.forEach(t => {
          counts[t.domain] = (counts[t.domain] || 0) + 1;
        });
        setToolCounts(counts);
        setTotalTools(tools.totalTools || tools.tools.length);
      }
      return h;
    });
  }, []);

  // Fetch once on mount — Conductor patrols handle ongoing checks
  useEffect(() => { refresh(); }, [refresh]);

  return { health, toolCounts, totalTools, refresh };
}
