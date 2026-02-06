import React, { useState } from 'react';

/**
 * Create tab - Class Selection with optional AI Wizard Creator
 * Redesigned for better layout and readability
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
  const [showAICreator, setShowAICreator] = useState(false);
  
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
      console.log('🧙 Playing as custom wizard:', generatedWizard.classId, generatedWizard);
      handleJoin(generatedWizard.classId);
    }
  };

  const classColor = classes[selectedClass]?.color || '#888';
  const classSecondary = classes[selectedClass]?.secondaryColor || classColor;

  // Filter visible classes
  const visibleClasses = Object.entries(classes).filter(([id, c]) => {
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
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700, margin: '0 auto', width: '100%' }}>
      
      {/* AI Creator Toggle Button */}
      <button
        onClick={() => setShowAICreator(!showAICreator)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: showAICreator ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${showAICreator ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 24, height: 24, color: '#a78bfa' }}>{SVG.wand}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>✨ AI Wizard Creator</div>
            <div style={{ color: '#888', fontSize: '0.78rem' }}>Design a unique wizard with custom abilities</div>
          </div>
        </div>
        <span style={{ color: '#666', fontSize: '1.2rem', transform: showAICreator ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      
      {/* Collapsible AI Creator */}
      {showAICreator && (
        <div style={{
          background: 'rgba(15,15,30,0.6)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 12,
          padding: isMobile ? 16 : 20,
        }}>
          <textarea
            value={wizardPrompt}
            onChange={(e) => { setWizardPrompt(e.target.value); setWizardError(''); }}
            placeholder="Describe your wizard... e.g., A storm samurai who channels lightning through his blade. His primary attack shoots electric slashes..."
            maxLength={600}
            disabled={wizardGenerating}
            rows={2}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${wizardError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 8,
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              disabled={wizardGenerating || wizardPrompt.trim().length < 3}
              onClick={onGenerate}
              style={{
                padding: '10px 20px',
                background: 'rgba(139,92,246,0.3)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 6,
                color: '#a78bfa',
                fontWeight: 600,
                fontSize: '0.85rem',
                opacity: (wizardGenerating || wizardPrompt.trim().length < 3) ? 0.5 : 1,
                cursor: wizardGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {wizardGenerating ? '⏳ Generating...' : '🪄 Generate'}
            </button>
            
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Storm Samurai', 'Void Necro', 'Nature Druid'].map(preset => (
                <button 
                  key={preset}
                  onClick={() => setWizardPrompt(preset)}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    color: '#555',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {wizardStatus && (
            <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, border: '2px solid #a78bfa', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              {wizardStatus}
            </div>
          )}
          {wizardError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 10 }}>{wizardError}</div>}

          {generatedWizard && generatedWizard.classDef && (
            <CompactWizardCard wizard={generatedWizard} onPlay={onPlayCustomWizard} />
          )}
        </div>
      )}
      
      {/* Class Grid Header */}
      <div style={{ color: '#ddd', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' }}>
        Choose Your Class
      </div>
      
      {/* Class Cards Grid - Wrapping */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {visibleClasses.map(([id, c]) => (
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
      
      {/* Play Section */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        padding: 20,
        background: `linear-gradient(135deg, ${classColor}10, rgba(0,0,0,0.3))`,
        border: `1px solid ${classColor}30`,
        borderRadius: 14,
        alignItems: 'center',
      }}>
        {/* Selected Class Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: `linear-gradient(135deg, ${classColor}30, ${classColor}10)`,
            border: `2px solid ${classColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ width: 30, height: 30, color: classSecondary }}>
              {CLASS_SVG[selectedClass] || SVG.arcane}
            </span>
          </div>
          <div>
            <div style={{ color: classColor, fontWeight: 700, fontSize: '1.1rem' }}>
              {classes[selectedClass]?.name || 'Select Class'}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', marginTop: 2 }}>
              <span style={{ color: '#ff6b6b' }}>❤️ {classes[selectedClass]?.baseHealth || 100}</span>
              <span style={{ color: '#74c0fc' }}>⚡ {classes[selectedClass]?.baseSpeed || 150}</span>
            </div>
          </div>
        </div>
        
        {/* Name Input + Play Button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: isMobile ? 'none' : '0 0 auto' }}>
          <input
            style={{ 
              width: isMobile ? '100%' : 140,
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
              fontSize: '0.9rem',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            type="text"
            placeholder="Wizard name"
            maxLength={20}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          
          <button 
            onClick={() => handleJoin()}
            style={{ 
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${classColor}, ${classSecondary})`,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: `0 4px 15px ${classColor}40`,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>▶</span> Play
          </button>
        </div>
      </div>
      
      {savedPlayer && (
        <button
          onClick={() => { setSavedPlayer(null); setTab('play'); }}
          style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#555',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          ← Back to {savedPlayer.name}
        </button>
      )}
    </div>
  );
}

/**
 * Compact class card for grid layout
 */
function ClassCard({ id, classData: c, isSelected, onClick, CLASS_SVG, SVG }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected 
          ? `linear-gradient(135deg, ${c.color}15, rgba(0,0,0,0.4))` 
          : 'rgba(20,20,30,0.6)',
        border: isSelected ? `2px solid ${c.color}` : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isSelected ? `${c.color}25` : 'rgba(255,255,255,0.05)',
          border: `2px solid ${isSelected ? c.color : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ width: 22, height: 22, color: c.secondaryColor || c.color }}>
            {CLASS_SVG[id] || SVG.arcane}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: isSelected ? c.color : '#ddd', fontWeight: 700, fontSize: '0.95rem' }}>
            {c.name}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.description}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>
        <span style={{ color: '#ff6b6b' }}>HP {c.baseHealth}</span>
        <span style={{ color: '#74c0fc' }}>SPD {c.baseSpeed}</span>
      </div>
      
      {/* Abilities - compact */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {c.dashAbility && (
          <span style={{ 
            padding: '3px 8px', 
            background: `${c.color}15`, 
            border: `1px solid ${c.color}30`,
            borderRadius: 4, 
            fontSize: '0.65rem', 
            color: c.secondaryColor || c.color,
          }}>
            ⚡ {c.dashAbility.name}
          </span>
        )}
        {c.ultimateAbility && (
          <span style={{ 
            padding: '3px 8px', 
            background: 'rgba(251,191,36,0.1)', 
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 4, 
            fontSize: '0.65rem', 
            color: '#fbbf24',
          }}>
            ✨ {c.ultimateAbility.name}
          </span>
        )}
      </div>
      
      {c.isAdmin && (
        <div style={{ 
          marginTop: 8, padding: '3px 8px', 
          background: 'rgba(239,68,68,0.15)', 
          borderRadius: 4, 
          fontSize: '0.6rem', 
          color: '#ef4444',
          textAlign: 'center',
        }}>
          ADMIN
        </div>
      )}
    </div>
  );
}

/**
 * Detailed generated wizard card with lore and full ability breakdown
 */
function CompactWizardCard({ wizard, onPlay }) {
  const { classDef, spellDefs } = wizard;
  
  return (
    <div style={{
      marginTop: 16,
      padding: 20,
      background: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      border: `1px solid ${classDef.color}50`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: `linear-gradient(135deg, ${classDef.color}40, ${classDef.color}15)`,
            border: `2px solid ${classDef.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            ✨
          </div>
          <div>
            <div style={{ color: classDef.color, fontWeight: 700, fontSize: '1.2rem' }}>{classDef.name}</div>
            <div style={{ display: 'flex', gap: 14, fontSize: '0.85rem', marginTop: 4 }}>
              <span style={{ color: '#ff6b6b' }}>❤️ HP {classDef.baseHealth}</span>
              <span style={{ color: '#74c0fc' }}>⚡ SPD {classDef.baseSpeed}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onPlay}
          style={{
            padding: '12px 24px',
            background: `linear-gradient(135deg, ${classDef.color}, ${classDef.secondaryColor || classDef.color})`,
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: `0 4px 15px ${classDef.color}40`,
          }}
        >
          ▶ Play
        </button>
      </div>
      
      {/* Lore/Description */}
      <div style={{ 
        color: '#ccc', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.6,
        padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
        borderLeft: `3px solid ${classDef.color}40`,
        fontStyle: 'italic',
      }}>
        {classDef.description}
      </div>
      
      {/* Abilities Section */}
      <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
        Abilities
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Dash Ability */}
        {classDef.dashAbility && (
          <AbilityRow
            label="DASH"
            labelColor="#60a5fa"
            name={classDef.dashAbility.name}
            color={classDef.color}
            stats={[
              { label: 'CD', value: `${(classDef.dashAbility.cooldown / 1000).toFixed(1)}s` },
              classDef.dashAbility.damage && { label: 'DMG', value: classDef.dashAbility.damage },
              { label: 'Range', value: classDef.dashAbility.distance || classDef.dashAbility.range || '—' },
            ].filter(Boolean)}
            description={classDef.dashAbility.description}
          />
        )}
        
        {/* Ultimate Ability */}
        {classDef.ultimateAbility && (
          <AbilityRow
            label="ULT"
            labelColor="#fbbf24"
            name={classDef.ultimateAbility.name}
            color={classDef.color}
            stats={[
              { label: 'CD', value: `${(classDef.ultimateAbility.cooldown / 1000).toFixed(0)}s` },
              classDef.ultimateAbility.damage && { label: 'DMG', value: classDef.ultimateAbility.damage },
              classDef.ultimateAbility.duration && { label: 'DUR', value: `${(classDef.ultimateAbility.duration / 1000).toFixed(1)}s` },
            ].filter(Boolean)}
            description={classDef.ultimateAbility.description}
          />
        )}
        
        {/* Spells */}
        {Object.values(spellDefs).slice(0, 3).map((spell, i) => (
          <AbilityRow
            key={spell.id}
            label={`SPELL ${i + 1}`}
            labelColor={spell.color || '#a78bfa'}
            name={spell.name}
            color={spell.color || '#a78bfa'}
            stats={[
              { label: 'DMG', value: spell.damage || '—' },
              { label: 'CD', value: `${((spell.cooldown || 1000) / 1000).toFixed(1)}s` },
              spell.range && { label: 'RNG', value: spell.range },
              spell.speed && { label: 'SPD', value: spell.speed },
            ].filter(Boolean)}
            description={spell.description}
            unlockLevel={[10, 20, 30][i]}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Single ability row in wizard card
 */
function AbilityRow({ label, labelColor, name, color, stats, description, unlockLevel }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: `${color}08`,
      border: `1px solid ${color}20`,
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
          background: `${labelColor}20`, color: labelColor, letterSpacing: 0.5,
        }}>
          {label}
        </span>
        <span style={{ color: '#ddd', fontWeight: 600, fontSize: '0.85rem' }}>{name}</span>
        {unlockLevel && (
          <span style={{ color: '#555', fontSize: '0.6rem', marginLeft: 'auto' }}>Lv{unlockLevel}</span>
        )}
      </div>
      {description && (
        <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: 6, lineHeight: 1.4 }}>{description}</div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {stats.map((s, i) => (
          <span key={i} style={{ fontSize: '0.7rem', color: '#888' }}>
            <span style={{ color: '#aaa', fontWeight: 600 }}>{s.label}</span> {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}