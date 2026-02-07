import React from 'react';
import { WIZARD_ICONS } from '../../constants/icons';

/**
 * Play tab - Character display, skin selection, and enter game
 */
export default function PlayTab({
  isMobile,
  styles,
  classes,
  characters,
  setCharacters,
  savedPlayer,
  setSavedPlayer,
  selectedCharIdx,
  setSelectedCharIdx,
  selectedSkin,
  setSelectedSkin,
  authState,
  setAuthState,
  confirmDeleteId,
  setConfirmDeleteId,
  setScreen,
  setTab,
  socketRef,
  playerIdRef,
  handleNewCharacter,
  setAdminKey,
  SVG,
  CLASS_SVG,
  DEFAULT_CLASSES,
  DEFAULT_SKINS,
  SERVER_URL,
  sessionTokenRef,
}) {
  const char = savedPlayer || characters[0];
  
  const handleContinue = () => {
    if (!char || !socketRef.current) return;
    
    const joinData = {
      playerId: char.id,
      playerName: char.name,
      playerClass: char.class,
      selectedSkin: selectedSkin || char.selectedSkin,
      sessionToken: sessionTokenRef?.current || null,
      isCustomWizard: char.isCustomWizard || false,
      customIconStyle: char.customIconStyle || null,
    };
    
    // If already in game, leave first then rejoin after server confirms
    if (playerIdRef?.current) {
      socketRef.current.emit('leave');
      if (playerIdRef) playerIdRef.current = null;
      // Wait for server 'left' confirmation, with 500ms fallback
      const doJoin = () => {
        if (!socketRef.current.connected) {
          socketRef.current.connect();
          socketRef.current.once('connect', () => socketRef.current.emit('join', joinData));
        } else {
          socketRef.current.emit('join', joinData);
        }
      };
      const fallback = setTimeout(doJoin, 500);
      socketRef.current.once('left', () => {
        clearTimeout(fallback);
        doJoin();
      });
    } else if (!socketRef.current.connected) {
      socketRef.current.connect();
      socketRef.current.once('connect', () => socketRef.current.emit('join', joinData));
    } else {
      socketRef.current.emit('join', joinData);
    }
  };

  const handleDeleteCharacter = async (charId) => {
    if (!sessionTokenRef?.current) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/auth/delete-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: sessionTokenRef.current, characterId: charId }),
      });
      const data = await res.json();
      if (data.success) {
        setCharacters(prev => prev.filter(c => c.id !== charId));
        if (savedPlayer?.id === charId) {
          const remaining = characters.filter(c => c.id !== charId);
          setSavedPlayer(remaining[0] || null);
        }
      }
    } catch (err) {
      console.error('Delete character error:', err);
    }
  };

  const handleLogout = () => {
    setAuthState?.({ isAuthenticated: false, isGuest: false, user: null, sessionToken: null });
    localStorage.removeItem('spellBrigadeSession');
    localStorage.removeItem('spellBrigadePlayerId');
    setSavedPlayer(null);
    setCharacters([]);
    setAdminKey?.('');
    setScreen('auth');
  };

  // No character - show create prompt
  if (!char) {
    return (
      <div style={{ textAlign: 'center', padding: isMobile ? 20 : 40, maxWidth: 500 }}>
        <div style={{
          width: 140, height: 140, margin: '0 auto 25px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(155,93,229,0.2), rgba(255,107,53,0.15))',
          border: '3px dashed rgba(155,93,229,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <WizardIcon />
        </div>
        
        <h2 style={{ color: '#c084fc', fontSize: '1.5rem', marginBottom: 10 }}>Begin Your Journey!</h2>
        <p style={{ color: '#888', fontSize: '0.95rem', marginBottom: 30, lineHeight: 1.6 }}>
          Create your first wizard and enter the arena.<br/>
          <span style={{ color: '#666' }}>Master spells, defeat bosses, conquer dungeons!</span>
        </p>
        
        <button onClick={() => setTab('create')}
          style={{
            padding: '16px 40px', fontSize: '1.1rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #9b5de5, #7c3aed)',
            border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 20px rgba(155,93,229,0.4)',
          }}
        >
          <span style={{ width: 20, height: 20, display: 'inline-flex' }}>{SVG.sparkle}</span> Create Your Wizard
        </button>
        
        <div style={{ marginTop: 20 }}>
          <button onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
          >Switch Account</button>
        </div>
      </div>
    );
  }

  const isCustomChar = char.isCustomWizard || false;
  const cwDef = isCustomChar ? (char.customWizardData?.classDef || {}) : {};
  const charClass = isCustomChar ? {} : (classes[char.class] || DEFAULT_CLASSES[char.class] || {});
  const charColor = isCustomChar ? (char.customColor || cwDef.color || '#a78bfa') : (charClass.color || '#888');
  const charClassName = isCustomChar ? (char.customClassName || cwDef.name || 'Custom Wizard') : (charClass.name || char.class);
  const charSecondaryColor = isCustomChar ? (char.customSecondaryColor || cwDef.secondaryColor || charColor) : (charClass.secondaryColor || charColor);
  const charDescription = isCustomChar ? (cwDef.description || '') : (charClass.description || '');
  const charLore = isCustomChar ? (cwDef.lore || '') : '';
  const charSkin = DEFAULT_SKINS.find(s => s.id === (selectedSkin || char.selectedSkin));
  const skinColor = charSkin?.color || charColor;

  const customIcon = isCustomChar ? (WIZARD_ICONS[char.customIconStyle || cwDef.iconStyle || 'star'] || WIZARD_ICONS.star) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      
      {/* Character Roster */}
      {characters.length > 1 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: characters.length <= 3 ? `repeat(${characters.length}, 1fr)` : 'repeat(3, 1fr)',
          gap: 8, maxWidth: 560, width: '100%', marginBottom: 8,
        }}>
          {characters.map((c, idx) => {
            const isCustom = c.isCustomWizard || false;
            const cwData = isCustom ? (c.customWizardData?.classDef || {}) : {};
            const cc = isCustom ? {} : (classes[c.class] || DEFAULT_CLASSES[c.class] || {});
            const isActive = c.id === char.id;
            const bgColor = isCustom ? (c.customColor || cwData.color || '#a78bfa') : (cc.color || '#888');
            const iconColor = isCustom ? (c.customSecondaryColor || cwData.secondaryColor || bgColor) : (cc.secondaryColor || cc.color || '#888');
            const displayName = isCustom ? (c.customClassName || cwData.name || 'Custom') : (cc.name || c.class);
            return (
              <button key={c.id} onClick={() => {
                setSavedPlayer(c);
                setSelectedCharIdx(idx);
                setSelectedSkin(c.selectedSkin || `${c.class}_default`);
              }}
                style={{
                  background: isActive 
                    ? `linear-gradient(135deg, ${bgColor}30, ${bgColor}15)` 
                    : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: isActive ? `2px solid ${bgColor}90` : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s',
                  boxShadow: isActive ? `0 4px 16px ${bgColor}25` : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `radial-gradient(circle at 40% 35%, ${bgColor}40, ${bgColor}15)`,
                  border: `1.5px solid ${bgColor}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ width: 20, height: 20, color: iconColor, filter: `drop-shadow(0 0 3px ${iconColor}60)` }}>
                    {isCustom ? (
                      WIZARD_ICONS[c.customIconStyle || cwData.iconStyle || 'star'] || WIZARD_ICONS.star
                    ) : (CLASS_SVG[c.class] || SVG.arcane)}
                  </span>
                </div>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{ color: isActive ? '#fff' : '#ccc', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ color: isActive ? iconColor : '#777', fontSize: '0.65rem', fontWeight: 500 }}>Lv.{c.level || 1} {displayName}</div>
                </div>
                {isActive && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, background: bgColor, boxShadow: `0 0 6px ${bgColor}` }} />
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Selected Character Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(30,30,50,0.7))',
        border: `2px solid ${charColor}`,
        borderRadius: 20,
        padding: isMobile ? 20 : 30,
        maxWidth: 420, width: '100%',
        boxShadow: `0 20px 60px ${charColor}30`,
        position: 'relative',
      }}>
        {/* Delete button */}
        {!authState.isGuest && (
          <button onClick={() => setConfirmDeleteId(char.id)} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6, padding: '4px 8px', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer',
          }}>
            <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{SVG.trash}</span>
          </button>
        )}
        
        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 110, height: 110, margin: '0 auto 15px', borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${skinColor}50, ${skinColor}15)`,
            border: `4px solid ${skinColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${skinColor}40, inset 0 0 30px ${skinColor}20`,
            position: 'relative', overflow: 'hidden',
          }}>
            {charSkin?.trail && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: `radial-gradient(circle, ${charSkin.trail}30 0%, transparent 70%)`,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
            )}
            <span style={{ width: 60, height: 60, color: charSkin?.secondaryColor || charSecondaryColor || skinColor, position: 'relative', zIndex: 1, filter: `drop-shadow(0 0 8px ${skinColor}80)` }}>
              {isCustomChar ? customIcon : (CLASS_SVG[char.class] || SVG.arcane)}
            </span>
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>{char.name}</div>
          <div style={{ color: charClass.secondaryColor || charColor, fontSize: '0.95rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
            {charClassName}
          </div>
          {isCustomChar && charDescription && (
            <div style={{ color: '#777', fontSize: '0.72rem', marginTop: 4 }}>{charDescription}</div>
          )}
          {charSkin && charSkin.id !== `${char.class}_default` && (
            <div style={{ color: skinColor, fontSize: '0.7rem', marginTop: 3, opacity: 0.8 }}>✦ {charSkin.name}</div>
          )}
        </div>
        
        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 15, padding: '14px 0', background: 'rgba(0,0,0,0.4)', borderRadius: 12 }}>
          <StatBox value={char.level || 1} label="Level" color="#ffd93d" />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <StatBox value={`${((char.totalXp || 0) / 1000).toFixed(1)}k`} label="XP" color="#22c55e" />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <StatBox value={char.kills || 0} label="Kills" color="#ef4444" />
        </div>
        
        {/* Skin Selector - only for standard classes */}
        {!isCustomChar && (
        <div style={{ marginBottom: 15 }}>
          <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>Skins</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {DEFAULT_SKINS.filter(s => s.class === char.class).map(skin => {
              const isUnlocked = skin.requiredXp >= 0 && skin.requiredXp <= (char.totalXp || 0) && !skin.locked;
              const isSel = (selectedSkin || char.selectedSkin) === skin.id;
              return (
                <div key={skin.id}
                  onClick={() => isUnlocked && setSelectedSkin(skin.id)}
                  title={isUnlocked ? skin.name : `${skin.name} - ${skin.locked ? 'COMING SOON' : `${skin.requiredXp.toLocaleString()} XP`}`}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: isUnlocked ? `linear-gradient(135deg, ${skin.color}60, ${skin.color}30)` : 'rgba(0,0,0,0.4)',
                    border: isSel ? `3px solid ${skin.color}` : '2px solid rgba(255,255,255,0.1)',
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isUnlocked ? 1 : 0.4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', transition: 'all 0.2s',
                    boxShadow: isSel ? `0 0 12px ${skin.color}50` : 'none',
                  }}
                >
                  {!isUnlocked && <span style={{ width: 12, height: 12, display: 'inline-flex' }}>{skin.locked ? SVG.crystal : SVG.lock}</span>}
                </div>
              );
            })}
          </div>
        </div>
        )}
        
        {/* Custom Wizard Info */}
        {isCustomChar && (
          <div style={{ marginBottom: 15, padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: `1px solid ${charColor}20` }}>
            <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, textAlign: 'center' }}>AI-Created Wizard</div>
            {charLore && <div style={{ color: '#777', fontSize: '0.72rem', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>"{charLore}"</div>}
          </div>
        )}
        
        {/* Enter Button */}
        <button 
          style={{ 
            width: '100%', padding: '16px 24px', fontSize: '1.1rem', fontWeight: 700,
            background: `linear-gradient(135deg, ${charColor}, ${charColor}cc)`,
            border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: `0 4px 20px ${charColor}50`, transition: 'all 0.2s',
          }} 
          onClick={handleContinue}
        >
          <span style={{ width: 24, height: 24 }}>{SVG.play}</span>
          Enter World
        </button>
      </div>
      
      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={handleNewCharacter}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 20px', color: '#888', fontSize: '0.8rem', cursor: 'pointer' }}
        >+ New Character</button>
        <button onClick={handleLogout}
          style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
        >Logout</button>
      </div>
      
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000 }} onClick={() => setConfirmDeleteId(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#1a1a2e', border: '2px solid #ef4444', borderRadius: 16, padding: 30,
            zIndex: 2001, maxWidth: 350, width: '90%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Delete Character?</div>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
              This will permanently delete <strong style={{ color: '#ef4444' }}>{characters.find(c => c.id === confirmDeleteId)?.name || 'this character'}</strong> and all progress.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{
                flex: 1, padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={() => { handleDeleteCharacter(confirmDeleteId); setConfirmDeleteId(null); }} style={{
                flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}>Delete Forever</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function WizardIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <path d="M45 2L26 42H64L45 2Z" fill="url(#wizHatG)" stroke="#c084fc" strokeWidth="1.5"/>
      <ellipse cx="45" cy="42" rx="24" ry="5" fill="#7c3aed" stroke="#c084fc" strokeWidth="1"/>
      <path d="M45 12L47.5 19L54 19L49 23.5L51 30L45 25.5L39 30L41 23.5L36 19L42.5 19Z" fill="#ffd93d"/>
      <circle cx="45" cy="51" r="11" fill="#fcd5ce"/>
      <circle cx="41" cy="49" r="2.5" fill="#1e1b4b"/>
      <circle cx="49" cy="49" r="2.5" fill="#1e1b4b"/>
      <path d="M41 54Q45 58 49 54" stroke="#6b4c3b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M36 55Q39 66 45 70Q51 66 54 55" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.8"/>
      <path d="M30 62L45 57L60 62L56 84H34L30 62Z" fill="url(#wizRobeG)"/>
      <defs>
        <linearGradient id="wizHatG" x1="45" y1="2" x2="45" y2="42">
          <stop offset="0%" stopColor="#9b5de5"/>
          <stop offset="100%" stopColor="#4c1d95"/>
        </linearGradient>
        <linearGradient id="wizRobeG" x1="30" y1="62" x2="60" y2="84">
          <stop offset="0%" stopColor="#4c1d95"/>
          <stop offset="100%" stopColor="#1e1b4b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
