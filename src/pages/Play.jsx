import React, { useState } from 'react';
import Layout from '../components/Layout';

const AVATARS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯'];

const Play = () => {
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartGame = () => {
    if (playerName && selectedAvatar !== null) {
      setGameStarted(true);
    }
  };

  if (gameStarted) {
    return (
      <Layout hideFooter>
        <section style={{ 
          paddingTop: '80px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="container" style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-md) 0',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <span style={{ fontSize: '2rem' }}>{AVATARS[selectedAvatar]}</span>
                <span style={{ fontWeight: 600 }}>{playerName}</span>
              </div>
              <button 
                className="btn btn-ghost"
                onClick={() => setGameStarted(false)}
              >
                Exit Game
              </button>
            </div>
            
            <div style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              minHeight: '500px'
            }}>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🎮</p>
                <h2 style={{ marginBottom: 'var(--space-md)' }}>Game Coming Soon</h2>
                <p>A multiplayer experience is in development.</p>
                <p style={{ marginTop: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Built with React and Canvas API
                </p>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container" style={{ maxWidth: '500px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <h1 style={{ marginBottom: 'var(--space-xl)' }}>Play</h1>
            
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <label style={{ 
                display: 'block',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                Enter your name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name..."
                style={{
                  width: '100%',
                  padding: 'var(--space-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  textAlign: 'center'
                }}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <label style={{ 
                display: 'block',
                marginBottom: 'var(--space-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                Select your avatar
              </label>
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                flexWrap: 'wrap'
              }}>
                {AVATARS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAvatar(index)}
                    style={{
                      width: '50px',
                      height: '50px',
                      fontSize: '1.5rem',
                      background: selectedAvatar === index ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      border: '2px solid',
                      borderColor: selectedAvatar === index ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="btn btn-primary"
              disabled={!playerName || selectedAvatar === null}
              style={{ width: '100%' }}
            >
              Start Game
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Play;
