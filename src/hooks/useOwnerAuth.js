import { useState, useEffect, useCallback } from 'react';
import { boardWrite } from '../utils/boardApi';

const STORAGE_KEY = 'board_owner_token';

/**
 * Owner auth for the board's private (editing) lens. The board password is a
 * server-only secret (BOARD_ADMIN_PASSWORD) — we can't verify it client-side,
 * so login pings the board-admin function (action: 'auth'); on 200 we cache
 * the token in sessionStorage and every write reuses it.
 */
export default function useOwnerAuth() {
  const [token, setToken] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setToken(saved);
      setIsOwner(true);
    }
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

  return { isOwner, token, login, logout, checking, error };
}
