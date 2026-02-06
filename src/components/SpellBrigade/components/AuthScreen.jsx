import React from 'react';

/**
 * Authentication screen with login, signup, and guest options
 */
export default function AuthScreen({
  visible,
  styles,
  isMobile,
  authScreen,
  setAuthScreen,
  authLoading,
  setAuthLoading,
  authError,
  setAuthError,
  setAuthState,
  setAdminKey,
  setSelectedClass,
  setSelectedSkin,
  setSettings,
  setQuestLog,
  setCharacters,
  setSavedPlayer,
  setSelectedCharIdx,
  setScreen,
  playersOnline,
  socketRef,
  sessionTokenRef,
  SERVER_URL,
}) {
  
  const handleGuestLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        // Clear any previous character data
        localStorage.removeItem('spellBrigadeCharacters');
        localStorage.removeItem('spellBrigadeSelectedChar');
        setAuthState({ isAuthenticated: true, isGuest: true, user: null, sessionToken: data.sessionToken });
        localStorage.setItem('spellBrigadeSession', JSON.stringify({ token: data.sessionToken, isGuest: true }));
        sessionTokenRef.current = data.sessionToken;
        setScreen('title');
      }
    } catch (err) {
      console.error('Guest auth error:', err);
      setScreen('title');
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const formData = new FormData(e.target);
    try {
      const res = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthState({ isAuthenticated: true, isGuest: false, user: data.user, sessionToken: data.sessionToken });
        localStorage.setItem('spellBrigadeSession', JSON.stringify({ token: data.sessionToken, isGuest: false }));
        sessionTokenRef.current = data.sessionToken;
        
        // Auto-enable admin for azoni
        if (data.user.username?.toLowerCase() === 'azoni') {
          setAdminKey('azoni-voidlord-2026');
          setSelectedClass('shadowarcher');
          setSelectedSkin('shadowarcher_default');
          if (socketRef.current) {
            socketRef.current.emit('authenticateAdmin', { sessionToken: data.sessionToken });
          }
        }
        
        if (data.user.settings) {
          setSettings(prev => ({ ...prev, ...data.user.settings }));
        }
        if (data.user.quests) {
          setQuestLog(prev => ({ ...prev, ...data.user.quests }));
        }
        if (data.user.characters?.length > 0) {
          setCharacters(data.user.characters);
          setSavedPlayer(data.user.characters[0]);
          setSelectedCharIdx(0);
        } else {
          setCharacters([]);
          setSavedPlayer(null);
        }
        setScreen('title');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    }
    setAuthLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      setAuthLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${SERVER_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthState({ isAuthenticated: true, isGuest: false, user: data.user, sessionToken: data.sessionToken });
        localStorage.setItem('spellBrigadeSession', JSON.stringify({ token: data.sessionToken, isGuest: false }));
        sessionTokenRef.current = data.sessionToken;
        setCharacters([]);
        setSavedPlayer(null);
        setScreen('title');
      } else {
        setAuthError(data.error || 'Signup failed');
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    }
    setAuthLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.95rem',
    marginBottom: 12,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ 
      ...styles.overlay, 
      ...(!visible ? styles.hidden : {}), 
      overflow: isMobile ? 'auto' : 'hidden', 
      WebkitOverflowScrolling: 'touch', 
      touchAction: 'pan-y' 
    }}>
      {/* Monster Background Decorations */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Slime */}
        <svg style={{ position: 'absolute', bottom: '10%', left: '5%', width: 80, height: 80, opacity: 0.15, animation: 'float 3s ease-in-out infinite' }} viewBox="0 0 40 40">
          <ellipse cx="20" cy="28" rx="16" ry="10" fill="#22c55e"/>
          <ellipse cx="20" cy="22" rx="14" ry="12" fill="#4ade80"/>
          <circle cx="14" cy="20" r="3" fill="#000"/>
          <circle cx="26" cy="20" r="3" fill="#000"/>
          <ellipse cx="20" cy="26" rx="4" ry="2" fill="#166534"/>
        </svg>
        
        {/* Skeleton */}
        <svg style={{ position: 'absolute', top: '15%', right: '8%', width: 70, height: 90, opacity: 0.12, animation: 'floatSlow 4s ease-in-out infinite' }} viewBox="0 0 40 50">
          <ellipse cx="20" cy="12" rx="10" ry="8" fill="#e5e5e5"/>
          <circle cx="15" cy="10" r="3" fill="#000"/>
          <circle cx="25" cy="10" r="3" fill="#000"/>
          <path d="M15 16 L17 18 L20 16 L23 18 L25 16" stroke="#000" strokeWidth="1" fill="none"/>
          <rect x="18" y="20" width="4" height="15" fill="#d4d4d4"/>
          <rect x="12" y="22" width="16" height="8" rx="2" fill="#e5e5e5"/>
          <rect x="16" y="35" width="3" height="12" fill="#d4d4d4"/>
          <rect x="21" y="35" width="3" height="12" fill="#d4d4d4"/>
        </svg>
        
        {/* Fire Elemental */}
        <svg style={{ position: 'absolute', bottom: '20%', right: '12%', width: 90, height: 100, opacity: 0.15, animation: 'float 2.5s ease-in-out infinite' }} viewBox="0 0 40 50">
          <path d="M20 5 Q30 15 28 25 Q32 30 25 40 Q20 45 15 40 Q8 30 12 25 Q10 15 20 5" fill="#f97316"/>
          <path d="M20 10 Q26 18 24 25 Q27 28 22 35 Q20 38 18 35 Q13 28 16 25 Q14 18 20 10" fill="#fbbf24"/>
          <path d="M20 15 Q23 20 22 25 Q18 28 20 32 Q17 25 18 22 Q17 18 20 15" fill="#fef3c7"/>
          <circle cx="16" cy="22" r="2" fill="#000"/>
          <circle cx="24" cy="22" r="2" fill="#000"/>
        </svg>
        
        {/* Ghost */}
        <svg style={{ position: 'absolute', top: '20%', left: '10%', width: 70, height: 80, opacity: 0.1, animation: 'floatSlow 5s ease-in-out infinite' }} viewBox="0 0 40 50">
          <path d="M8 45 L8 20 Q8 5 20 5 Q32 5 32 20 L32 45 L28 40 L24 45 L20 40 L16 45 L12 40 L8 45" fill="#e0e7ff"/>
          <circle cx="14" cy="20" r="4" fill="#1e1b4b"/>
          <circle cx="26" cy="20" r="4" fill="#1e1b4b"/>
          <ellipse cx="20" cy="30" rx="4" ry="3" fill="#c7d2fe"/>
        </svg>
        
        {/* Dragon silhouette */}
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 300, opacity: 0.03 }} viewBox="0 0 100 80">
          <path d="M10 60 L15 50 L20 55 L30 40 L40 45 L50 30 L60 35 L70 25 L75 30 L85 20 L90 25 L95 15 L90 30 L80 35 L70 45 L60 50 L50 55 L40 60 L30 58 L20 62 L10 60" fill="#991b1b"/>
          <ellipse cx="50" cy="55" rx="35" ry="15" fill="#7f1d1d"/>
          <path d="M15 60 L5 70 L20 65" fill="#991b1b"/>
          <path d="M85 60 L95 70 L80 65" fill="#991b1b"/>
        </svg>
        
        {/* Ice crystal */}
        <svg style={{ position: 'absolute', bottom: '5%', left: '45%', width: 60, height: 80, opacity: 0.1, animation: 'float 4s ease-in-out infinite' }} viewBox="0 0 30 40">
          <path d="M15 0 L22 15 L30 20 L22 25 L15 40 L8 25 L0 20 L8 15 Z" fill="#0ea5e9"/>
          <path d="M15 5 L20 15 L25 20 L20 25 L15 35 L10 25 L5 20 L10 15 Z" fill="#38bdf8"/>
          <path d="M15 10 L18 18 L15 30 L12 18 Z" fill="#bae6fd"/>
        </svg>
      </div>
      
      {/* Auth Content */}
      <div style={styles.title}>
        <svg width={isMobile ? 42 : 56} height={isMobile ? 42 : 56} viewBox="0 0 48 48">
          <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="#ffd93d"/>
          <circle cx="24" cy="24" r="6" fill="#ff6b35"/>
        </svg>
        <h1 style={styles.titleText}>Spell Brigade</h1>
      </div>
      <p style={{ ...styles.subtitle, marginBottom: 30 }}>Survive the magical wilderness</p>
      
      {/* Auth Forms Container */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        padding: isMobile ? 20 : 30,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        width: isMobile ? '90%' : 380,
        maxWidth: 400,
      }}>
        {authScreen === 'main' && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 20, fontSize: '1.3rem', color: '#fff' }}>Welcome</h2>
            
            <button
              onClick={handleGuestLogin}
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #ffd93d, #f97316)',
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play as Guest
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: '#666', fontSize: '0.8rem' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            
            <button
              onClick={() => { setAuthScreen('login'); setAuthError(null); }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 10,
                color: '#3b82f6',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              Log In
            </button>
            
            <button
              onClick={() => { setAuthScreen('signup'); setAuthError(null); }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'rgba(34,197,94,0.2)',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 10,
                color: '#22c55e',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Create Account
            </button>
            
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.75rem', marginTop: 16 }}>
              Create an account to save your progress across devices
            </p>
          </>
        )}
        
        {authScreen === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setAuthScreen('main')}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Log In</h2>
            </div>
            
            {authError && (
              <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>
                {authError}
              </div>
            )}
            
            <input name="username" type="text" placeholder="Username" required style={inputStyle} />
            <input name="password" type="password" placeholder="Password" required style={{ ...inputStyle, marginBottom: 20 }} />
            
            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: authLoading ? '#666' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: authLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {authLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        )}
        
        {authScreen === 'signup' && (
          <form onSubmit={handleSignup}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setAuthScreen('main')}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Create Account</h2>
            </div>
            
            {authError && (
              <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>
                {authError}
              </div>
            )}
            
            <input name="username" type="text" placeholder="Username (3-20 characters)" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" style={inputStyle} />
            <input name="password" type="password" placeholder="Password (6+ characters)" required minLength={6} style={inputStyle} />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" required minLength={6} style={{ ...inputStyle, marginBottom: 20 }} />
            
            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: authLoading ? '#666' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: authLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {authLoading ? 'Creating...' : 'Create Account'}
            </button>
            
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.7rem', marginTop: 12 }}>
              Letters, numbers, and underscores only
            </p>
          </form>
        )}
      </div>
      
      {/* Players Online */}
      {playersOnline > 0 && (
        <div style={{ marginTop: 20, color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
          {playersOnline} wizard{playersOnline !== 1 ? 's' : ''} online
        </div>
      )}
    </div>
  );
}
