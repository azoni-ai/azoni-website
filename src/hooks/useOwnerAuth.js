import { useState, useEffect, useCallback } from 'react';
import { boardWrite } from '../utils/boardApi';

const STORAGE_KEY = 'board_owner_token';

/**
 * Owner auth for the board's private (editing) lens. The board password is a
 * server-only secret (BOARD_ADMIN_PASSWORD) — we can't verify it client-side,
 * so login pings the board-admin function (action: 'auth'); on 200 we cache
 * the token in sessionStorage and every write reuses it.
 *
 * A saved token is re-verified on mount (it may have been rotated), and
 * `invalidate()` lets callers drop auth state when a write comes back 401.
 */
export default function useOwnerAuth() {
  const [token, setToken] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    // Optimistic (avoids a UI flash for the common valid case), then verify.
    setToken(saved);
    setIsOwner(true);
    let cancelled = false;
    boardWrite(saved, 'auth').catch((err) => {
      if (cancelled) return;
      // Only a real auth rejection invalidates — network blips, cold-start
      // 5xx, and 429 throttles must not sign a valid session out. Guard
      // against a login racing the verify: only clear the token we checked.
      if (err?.status !== 401) return;
      if (sessionStorage.getItem(STORAGE_KEY) !== saved) return;
      sessionStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setIsOwner(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (password) => {
    if (!password) return false;
    setChecking(true);
    setError('');
    try {
      await boardWrite(password, 'auth');
      sessionStorage.setItem(STORAGE_KEY, password);
      setToken(password);
      setIsOwner(true);
      setChecking(false);
      return true;
    } catch (err) {
      setError(err.status === 401 ? 'Incorrect password' : err.message || 'Sign-in failed');
      setChecking(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setIsOwner(false);
    setError('');
  }, []);

  // For stale tokens discovered mid-session (a write returned 401).
  const invalidate = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setIsOwner(false);
  }, []);

  return { isOwner, token, login, logout, invalidate, checking, error };
}
