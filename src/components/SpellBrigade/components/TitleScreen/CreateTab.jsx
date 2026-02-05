import React from 'react';

/**
 * Create tab - AI Wizard Creator and Class Selection
 */
export default function CreateTab({
  isMobile,
  classes,
  selectedClass,
  playerName,
  setPlayerName,
  savedPlayer,
  setSavedPlayer,
  characters,
  authState,
  playerInfo,
  adminKey,
  wizardPrompt,
  setWizardPrompt,
  wizardGenerating,
  setWizardGenerating,
  wizardStatus,
  wizardError,
  setWizardError,
  generatedWizard,
  setGeneratedWizard,
  socketRef,
  sessionTokenRef,
  screenRef,
  pendingCustomWizardRef,
  handleJoin,
  handleClassChange,
  setTab,
  SVG,
  CLASS_SVG,
}) {
  const onGenerate = () => {
    if (socketRef.current && wizardPrompt.trim().length >= 3) {
      setWizardGenerating(true);
      setWizardError('');
      setGeneratedWizard(null);
      socketRef.current.emit('generateWizard', { 
        prompt: wizardPrompt.trim(), 
        sessionToken: sessionTokenRef.current 
      });
    }
  };

  const onPlayCustomWizard = () => {
    if (generatedWizard?.classId) {
      console.log('🧙 Playing as custom wizard:', generatedWizard.classId);
      // Pass the custom wizard classId directly to handleJoin
      handleJoin(generatedWizard.classId);
    }
  };

  const classColor = classes[selectedClass]?.color || '#888';
  const classSecondary = classes[selectedClass]?.secondaryColor || classColor;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      
      {/* AI Wizard Creator */}
      <div style={{
        background: 'rgba(15,15,30,0.8)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 16,
        padding: isMobile ? 20 : 28,
        position: 'relative',
      }}>
        {/* Magical accent line */}
        <div style={{ 
          position: 'absolute', top: 0, left: 24, right: 24, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(236,72,153,0.5), transparent)',
        }} />
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(139,92,246,0.15)',
            border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ width: 26, height: 26, color: '#a78bfa' }}>{SVG.wand}</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem' }}>AI Wizard Creator</div>
            <div style={{ color: '#666', fontSize: '0.8rem' }}>Describe your wizard in detail - the more you write, the better!</div>
          </div>
        </div>
        
        {/* Prompt Textarea */}
        <textarea
          value={wizardPrompt}
          onChange={(e) => { setWizardPrompt(e.target.value); setWizardError(''); }}
          placeholder="A storm samurai who channels lightning through his blade. His primary attack shoots electric slashes. His dash leaves a trail of sparks. His ultimate calls down a devastating thunder strike..."
          maxLength={600}
          disabled={wizardGenerating}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && wizardPrompt.trim().length >= 3 && !wizardGenerating) {
              e.preventDefault();
              onGenerate();
            }
          }}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${wizardError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10,
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
        
        {/* Generate Button + Quick Ideas */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button
            disabled={wizardGenerating || wizardPrompt.trim().length < 3}
            onClick={onGenerate}
            style={{
              padding: '12px 28px',
              background: wizardGenerating ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.3)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 8,
              color: '#a78bfa',
              fontWeight: 600,
              fontSize: '0.9rem',
              opacity: (wizardGenerating || wizardPrompt.trim().length < 3) ? 0.5 : 1,
              cursor: wizardGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {wizardGenerating ? 'Generating...' : 'Generate Wizard'}
          </button>
          
          {!generatedWizard && !wizardGenerating && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#555', fontSize: '0.75rem' }}>Ideas:</span>
              {['Storm Samurai', 'Void Necromancer', 'Nature Druid', 'Lava Berserker'].map(preset => (
                <button 
                  key={preset}
                  onClick={() => setWizardPrompt(preset)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: '#777',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        {wizardStatus && (
          <div style={{ color: '#a78bfa', fontSize: '0.85rem', marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 14, height: 14, border: '2px solid #a78bfa', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            {wizardStatus}
          </div>
        )}
        {wizardError && (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 16 }}>{wizardError}</div>
        )}

        {/* Generated Wizard Result */}
        {generatedWizard && generatedWizard.classDef && (
          <GeneratedWizardCard
            wizard={generatedWizard}
            isMobile={isMobile}
            onPlay={onPlayCustomWizard}
          />
        )}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ color: '#444', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2 }}>or choose a class</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      
      {/* Character Creation Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: 24,
      }}>
        {/* Left - Character Preview & Name */}
        <div style={{
          flex: isMobile ? 'none' : '0 0 280px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            border: `2px solid ${classColor}40`,
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
          }}>
            {/* Class Icon */}
            <div style={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${classColor}30, ${classColor}10)`,
              border: `3px solid ${classColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${classColor}30`,
            }}>
              <span style={{ width: 44, height: 44, color: classSecondary }}>
                {CLASS_SVG[selectedClass] || SVG.arcane}
              </span>
            </div>
            
            <div style={{ color: classColor, fontWeight: 700, fontSize: '1.2rem', marginBottom: 4 }}>
              {classes[selectedClass]?.name || 'Select a Class'}
            </div>
            <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 16 }}>
              {classes[selectedClass]?.description || ''}
            </div>
            
            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '1.2rem' }}>{classes[selectedClass]?.baseHealth || 100}</div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>HP</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#74c0fc', fontWeight: 700, fontSize: '1.2rem' }}>{classes[selectedClass]?.baseSpeed || 150}</div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>Speed</div>
              </div>
            </div>
            
            {/* Abilities Preview */}
            {classes[selectedClass] && (
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                {classes[selectedClass].dashAbility && (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: `${classColor}15`, 
                    border: `1px solid ${classColor}40`,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}>
                    <div style={{ fontSize: '0.8rem', color: classSecondary, fontWeight: 600 }}>
                      ⚡ {classes[selectedClass].dashAbility.name}
                    </div>
                    {classes[selectedClass].dashAbility.description && (
                      <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 3 }}>
                        {classes[selectedClass].dashAbility.description}
                      </div>
                    )}
                  </div>
                )}
                {classes[selectedClass].ultimateAbility && (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: 'rgba(251,191,36,0.12)', 
                    border: '1px solid rgba(251,191,36,0.4)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>
                      ✨ {classes[selectedClass].ultimateAbility.name}
                    </div>
                    {classes[selectedClass].ultimateAbility.description && (
                      <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 3 }}>
                        {classes[selectedClass].ultimateAbility.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <input
              style={{ 
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#fff',
                fontSize: '0.95rem',
                textAlign: 'center',
                marginBottom: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              type="text"
              placeholder="Wizard name (or random)"
              maxLength={20}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            
            <button 
              onClick={handleJoin}
              style={{ 
                width: '100%',
                padding: '16px',
                fontSize: '1.05rem',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${classColor}, ${classSecondary})`,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: `0 4px 20px ${classColor}40`,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Create & Play
            </button>
          </div>
          
          {savedPlayer && (
            <button
              onClick={() => { setSavedPlayer(null); setTab('play'); }}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#666',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ← Back to {savedPlayer.name}
            </button>
          )}
        </div>
        
        {/* Right - Class Selection */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Choose Your Class
          </div>
          
          {/* Class cards */}
          <div style={{ 
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            paddingBottom: 12,
            WebkitOverflowScrolling: 'touch',
          }}>
            {Object.entries(classes)
              .filter(([id, c]) => {
                if (adminKey === 'azoni-voidlord-2026') return true;
                if (id === 'voidlord') {
                  const hasDragonKill = savedPlayer?.bossKills?.dragon || 
                    characters?.some(ch => ch.bossKills?.dragon) ||
                    authState?.user?.characters?.some(ch => ch.bossKills?.dragon) ||
                    playerInfo?.bossKills?.dragon;
                  return hasDragonKill;
                }
                if ((c.hidden || c.isAdmin) && adminKey !== 'azoni-voidlord-2026') return false;
                return true;
              })
              .map(([id, c]) => (
                <ClassCard 
                  key={id}
                  id={id}
                  classData={c}
                  isSelected={selectedClass === id}
                  onClick={() => handleClassChange(id)}
                  CLASS_SVG={CLASS_SVG}
                  SVG={SVG}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generated wizard result card
 */
function GeneratedWizardCard({ wizard, isMobile, onPlay }) {
  const { classDef, spellDefs } = wizard;
  
  return (
    <div style={{
      marginTop: 20,
      padding: 20,
      background: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      border: `1px solid ${classDef.color}40`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: `linear-gradient(135deg, ${classDef.color}40, ${classDef.color}15)`,
          border: `2px solid ${classDef.color}`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: classDef.color, fontWeight: 700, fontSize: '1.3rem', marginBottom: 4 }}>
            {classDef.name}
          </div>
          <div style={{ color: '#999', fontSize: '0.85rem', marginBottom: 8 }}>{classDef.description}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
            <span style={{ color: '#f87171' }}>HP {classDef.baseHealth}</span>
            <span style={{ color: '#60a5fa' }}>Speed {classDef.baseSpeed}</span>
          </div>
        </div>
      </div>
      
      {/* Lore */}
      {classDef.lore && (
        <div style={{ 
          color: '#888', fontSize: '0.85rem', fontStyle: 'italic', 
          marginBottom: 16, padding: '12px 16px',
          background: 'rgba(255,255,255,0.02)',
          borderLeft: `3px solid ${classDef.color}40`,
          borderRadius: '0 8px 8px 0',
        }}>
          "{classDef.lore}"
        </div>
      )}
      
      {/* Main Spells (auto-cast) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Auto-Cast Spells</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          {Object.values(spellDefs).slice(0, 2).map(spell => (
            <div key={spell.id} style={{
              padding: '10px 14px',
              background: `${spell.color}10`,
              border: `1px solid ${spell.color}30`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: spell.color }} />
                <span style={{ color: '#ddd', fontWeight: 600, fontSize: '0.9rem' }}>{spell.name}</span>
              </div>
              <div style={{ color: '#888', fontSize: '0.75rem' }}>
                {spell.damage} dmg · {(spell.cooldown/1000).toFixed(1)}s cd · {spell.range} range
                {spell.isAoe && ' · AOE'}
                {spell.piercing && ' · Pierce'}
                {spell.slowEffect && ' · Slow'}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Level-up Abilities */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Level-Up Abilities</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.values(spellDefs).slice(2, 5).map((spell, idx) => (
            <div key={spell.id} style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              flex: '1 1 auto',
              minWidth: isMobile ? '100%' : 150,
            }}>
              <div style={{ color: '#a78bfa', fontSize: '0.7rem', marginBottom: 2 }}>Lv.{[10, 20, 30][idx]}</div>
              <div style={{ color: '#ccc', fontWeight: 600, fontSize: '0.8rem' }}>{spell.name}</div>
              <div style={{ color: '#666', fontSize: '0.7rem' }}>{spell.damage} dmg</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Dash & Ultimate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.2)' }}>
          <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
            {classDef.dashAbility?.name || 'Dash'}
          </div>
          <div style={{ color: '#666', fontSize: '0.75rem' }}>
            {classDef.dashAbility?.distance}px dash · {(classDef.dashAbility?.cooldown/1000).toFixed(0)}s cd
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)' }}>
          <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
            {classDef.ultimateAbility?.name || 'Ultimate'}
          </div>
          <div style={{ color: '#666', fontSize: '0.75rem' }}>
            {classDef.ultimateAbility?.damage} dmg · {classDef.ultimateAbility?.radius}px · {(classDef.ultimateAbility?.cooldown/1000).toFixed(0)}s cd
          </div>
        </div>
      </div>

      {/* Play Button */}
      <button
        onClick={onPlay}
        style={{
          width: '100%',
          padding: '14px',
          background: `${classDef.color}25`,
          border: `1px solid ${classDef.color}`,
          borderRadius: 10,
          color: classDef.color,
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Play as {classDef.name}
      </button>
    </div>
  );
}

/**
 * Class selection card
 */
function ClassCard({ id, classData: c, isSelected, onClick, CLASS_SVG, SVG }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: '0 0 260px',
        background: isSelected 
          ? `linear-gradient(180deg, ${c.color}20 0%, rgba(0,0,0,0.6) 100%)` 
          : 'rgba(20,20,30,0.8)',
        border: isSelected ? `2px solid ${c.color}` : '1px solid rgba(255,255,255,0.15)',
        borderRadius: 14,
        padding: 18,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* Header with icon and name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: 12,
          background: isSelected ? `${c.color}30` : 'rgba(255,255,255,0.08)',
          border: `2px solid ${isSelected ? c.color : 'rgba(255,255,255,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ width: 28, height: 28, color: c.secondaryColor || c.color }}>
            {CLASS_SVG[id] || SVG.arcane}
          </span>
        </div>
        <div>
          <div style={{ color: isSelected ? c.color : '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
            {c.name}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.3 }}>
            {c.description}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: '0.9rem', fontWeight: 600 }}>
        <span style={{ color: '#ff6b6b' }}>HP {c.baseHealth}</span>
        <span style={{ color: '#74c0fc' }}>SPD {c.baseSpeed}</span>
      </div>
      
      {/* Abilities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {c.dashAbility && (
          <div style={{ 
            padding: '6px 10px', 
            background: `${c.color}15`, 
            border: `1px solid ${c.color}40`,
            borderRadius: 6, 
          }}>
            <div style={{ fontSize: '0.75rem', color: c.secondaryColor || c.color, fontWeight: 600 }}>
              ⚡ {c.dashAbility.name}
            </div>
            {c.dashAbility.description && (
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 2 }}>
                {c.dashAbility.description}
              </div>
            )}
          </div>
        )}
        {c.ultimateAbility && (
          <div style={{ 
            padding: '6px 10px', 
            background: 'rgba(251,191,36,0.12)', 
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 6, 
          }}>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
              ✨ {c.ultimateAbility.name}
            </div>
            {c.ultimateAbility.description && (
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 2 }}>
                {c.ultimateAbility.description}
              </div>
            )}
          </div>
        )}
      </div>
      
      {c.isAdmin && (
        <div style={{ 
          marginTop: 10,
          fontSize: '.55rem', background: '#ff00ff',
          color: '#000', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold',
          display: 'inline-block',
        }}>ADMIN</div>
      )}
    </div>
  );
}
