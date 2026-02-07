import React, { useState } from 'react';
import { WIZARD_ICONS } from '../../constants/icons';

/**
 * Create tab - Class Selection with AI Wizard Creator
 * Enhanced wizard card shows full class breakdown
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
  adminStartLevel,
  setAdminStartLevel,
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
  const [modelQuality, setModelQuality] = useState('premium');
  
  const onGenerate = () => {
    if (socketRef.current && wizardPrompt.trim().length >= 3) {
      setWizardGenerating(true);
      setWizardError('');
      setGeneratedWizard(null);
      socketRef.current.emit('generateWizard', { 
        prompt: wizardPrompt.trim(), 
        sessionToken: sessionTokenRef.current,
        quality: modelQuality,
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
    return true; // All classes available to everyone
  });

  const PRESETS = [
    { label: '⚡ Storm Samurai', prompt: 'A storm samurai who channels lightning through his blade. Fast attacks, electric slashes.' },
    { label: '🩸 Blood Knight', prompt: 'A blood knight who drains life from enemies. Dark crimson magic, lifesteal abilities.' },
    { label: '🌿 Nature Druid', prompt: 'A nature druid who summons thorns and toxic spores. Slowing vine attacks.' },
    { label: '⏳ Chronomancer', prompt: 'A time mage who bends temporal reality. Slowing enemies, rewinding damage.' },
    { label: '🌊 Tidecaller', prompt: 'An ocean mage who commands waves and whirlpools. Water magic with crowd control.' },
    { label: '💀 Necromancer', prompt: 'A necromancer who wields death magic. Soul-ripping projectiles and dark AOE.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* AI Creator Toggle */}
      <button
        onClick={() => setShowAICreator(!showAICreator)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: showAICreator ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${showAICreator ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 24, height: 24, color: '#a78bfa' }}>{SVG.wand}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>✨ AI Wizard Creator</div>
            <div style={{ color: '#666', fontSize: '0.75rem' }}>Describe any wizard — AI builds it with custom spells & abilities</div>
          </div>
        </div>
        <span style={{ color: '#666', fontSize: '1.2rem', transform: showAICreator ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      
      {/* AI Creator Panel */}
      {showAICreator && (
        <div style={{
          background: 'rgba(15,15,30,0.6)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 12, padding: isMobile ? 16 : 20,
        }}>
          <textarea
            value={wizardPrompt}
            onChange={(e) => { setWizardPrompt(e.target.value); setWizardError(''); }}
            placeholder="Describe your wizard concept... e.g. A gravity mage who crushes enemies with black holes. Primary attack launches dense orbs, secondary creates a gravity well that pulls enemies in..."
            maxLength={600}
            disabled={wizardGenerating}
            rows={3}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${wizardError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 8, color: '#fff', fontSize: '0.85rem',
              outline: 'none', resize: 'none', fontFamily: 'inherit',
              lineHeight: 1.5, marginBottom: 10, boxSizing: 'border-box',
            }}
          />
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              disabled={wizardGenerating || wizardPrompt.trim().length < 3}
              onClick={onGenerate}
              style={{
                padding: '10px 22px',
                background: wizardGenerating ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.3)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 8, color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem',
                opacity: (wizardGenerating || wizardPrompt.trim().length < 3) ? 0.5 : 1,
                cursor: wizardGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {wizardGenerating ? '⏳ Creating...' : '🪄 Create Wizard'}
            </button>
            
            <span style={{ color: '#444', fontSize: '0.7rem' }}>
              {wizardPrompt.trim().length}/600
            </span>
          </div>

          {/* Model Quality Selector */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 12,
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ color: '#888', fontSize: '0.75rem', lineHeight: '32px', marginRight: 4, whiteSpace: 'nowrap' }}>AI Model:</span>
            <button
              onClick={() => setModelQuality('standard')}
              disabled={wizardGenerating}
              style={{
                flex: 1, padding: '6px 12px',
                background: modelQuality === 'standard' ? 'rgba(34,197,94,0.15)' : 'transparent',
                border: `1px solid ${modelQuality === 'standard' ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, cursor: wizardGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ color: modelQuality === 'standard' ? '#22c55e' : '#888', fontWeight: 600, fontSize: '0.8rem' }}>
                ⚡ Standard
              </div>
              <div style={{ color: '#555', fontSize: '0.65rem', marginTop: 2 }}>
                Haiku · Fast (~3s)
              </div>
            </button>
            <button
              onClick={() => setModelQuality('premium')}
              disabled={wizardGenerating}
              style={{
                flex: 1, padding: '6px 12px',
                background: modelQuality === 'premium' ? 'rgba(139,92,246,0.15)' : 'transparent',
                border: `1px solid ${modelQuality === 'premium' ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, cursor: wizardGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ color: modelQuality === 'premium' ? '#a78bfa' : '#888', fontWeight: 600, fontSize: '0.8rem' }}>
                ✨ Premium
              </div>
              <div style={{ color: '#555', fontSize: '0.65rem', marginTop: 2 }}>
                Sonnet · Best quality (~6s)
              </div>
            </button>
          </div>

          {/* Preset Ideas */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ color: '#555', fontSize: '0.7rem', lineHeight: '26px' }}>Ideas:</span>
            {PRESETS.map(p => (
              <button 
                key={p.label}
                onClick={() => setWizardPrompt(p.prompt)}
                disabled={wizardGenerating}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, color: '#666', fontSize: '0.7rem',
                  cursor: wizardGenerating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {wizardStatus && !generatedWizard && (
            <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, border: '2px solid #a78bfa', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              {wizardStatus}
              <span style={{ color: '#555', fontSize: '0.7rem' }}>
                ({modelQuality === 'premium' ? 'Sonnet' : 'Haiku'})
              </span>
            </div>
          )}
          {wizardError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 10 }}>{wizardError}</div>}

          {generatedWizard && generatedWizard.classDef && (
            <WizardResultCard 
              wizard={generatedWizard} 
              onPlay={onPlayCustomWizard}
              playerName={playerName}
              setPlayerName={setPlayerName}
              isMobile={isMobile}
            />
          )}
        </div>
      )}
      
      {/* Class Grid Header */}
      <div style={{ color: '#888', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        Choose Your Class
      </div>
      
      {/* Class Cards Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {visibleClasses.map(([id, c]) => (
          <ClassCard 
            key={id} id={id} classData={c}
            isSelected={selectedClass === id}
            onClick={() => handleClassChange(id)}
            CLASS_SVG={CLASS_SVG} SVG={SVG}
          />
        ))}
      </div>
      
      {/* Play Section */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        gap: 16, padding: 20,
        background: `linear-gradient(135deg, ${classColor}10, rgba(0,0,0,0.3))`,
        border: `1px solid ${classColor}30`,
        borderRadius: 14, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: `linear-gradient(135deg, ${classColor}30, ${classColor}10)`,
            border: `2px solid ${classColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
        
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: isMobile ? 'none' : '0 0 auto' }}>
          <input
            style={{ 
              width: isMobile ? '100%' : 180, padding: '12px 16px',
              background: 'rgba(0,0,0,0.5)', border: `2px solid ${playerName.trim() ? classColor + '50' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 10, color: '#fff', fontSize: '1rem', fontWeight: 500,
              textAlign: 'center', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            type="text" placeholder="Your wizard name" maxLength={20}
            value={playerName} onChange={(e) => setPlayerName(e.target.value)}
          />
          <button 
            onClick={() => handleJoin()}
            style={{ 
              padding: '12px 24px', fontSize: '1rem', fontWeight: 700,
              background: `linear-gradient(135deg, ${classColor}, ${classSecondary})`,
              border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 15px ${classColor}40`, whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>▶</span> Play
          </button>
          {adminKey && (
            <button
              onClick={() => setAdminStartLevel?.(!adminStartLevel)}
              style={{
                padding: '8px 12px', fontSize: '0.75rem', fontWeight: 600,
                background: adminStartLevel ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${adminStartLevel ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 6, color: adminStartLevel ? '#fbbf24' : '#888',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              title="Start at level 30 for testing"
            >
              Lv30
            </button>
          )}
        </div>
      </div>
      
      {savedPlayer && (
        <button
          onClick={() => { setSavedPlayer(null); setTab('play'); }}
          style={{
            padding: '10px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            color: '#555', fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          ← Back to {savedPlayer.name}
        </button>
      )}
    </div>
  );
}

/**
 * Full wizard result card - shows everything like a real class
 */
function WizardResultCard({ wizard, onPlay, playerName, setPlayerName, isMobile }) {
  const { classDef, spellDefs, generatedBy, modelUsed } = wizard;
  const c = classDef;
  const spells = Object.values(spellDefs);
  const primary = spells[0];
  const secondary = spells[1];
  // Abilities are spells with type 'classAbility'
  const abilities = spells.filter(s => s.type === 'classAbility');
  
  const isAI = generatedBy === 'ai';
  const modelLabel = isAI ? (modelUsed === 'standard' ? 'Haiku' : 'Sonnet') : 'Template';

  const StatPill = ({ label, value, color }) => (
    <span style={{
      padding: '3px 8px', background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 4, fontSize: '0.72rem', color, fontWeight: 600,
    }}>
      {label} {value}
    </span>
  );

  const SpellRow = ({ spell, label, labelColor }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      background: 'rgba(255,255,255,0.02)', borderRadius: 6,
      border: `1px solid ${spell.color || c.color}15`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
        background: `${spell.color || c.color}25`,
        border: `1px solid ${spell.color || c.color}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', color: spell.color || c.color, fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#ddd', fontWeight: 600, fontSize: '0.8rem' }}>{spell.name}</span>
          {spell.piercing && <span style={{ color: '#f59e0b', fontSize: '0.6rem', padding: '1px 4px', background: 'rgba(245,158,11,0.15)', borderRadius: 3 }}>PIERCE</span>}
          {spell.homing && <span style={{ color: '#a78bfa', fontSize: '0.6rem', padding: '1px 4px', background: 'rgba(167,139,250,0.15)', borderRadius: 3 }}>HOMING</span>}
          {spell.slowEffect && <span style={{ color: '#06b6d4', fontSize: '0.6rem', padding: '1px 4px', background: 'rgba(6,182,212,0.15)', borderRadius: 3 }}>SLOW</span>}
        </div>
        <div style={{ color: '#666', fontSize: '0.68rem', marginTop: 2 }}>
          {spell.description || `${spell.damage} dmg · ${spell.cooldown < 1000 ? spell.cooldown + 'ms' : (spell.cooldown / 1000).toFixed(1) + 's'} cd${spell.isAoe ? ' · AOE' : ''}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: '#ff6b6b', fontSize: '0.75rem', fontWeight: 600 }}>{spell.damage} dmg</div>
        <div style={{ color: '#888', fontSize: '0.65rem' }}>
          {spell.cooldown < 1000 ? spell.cooldown + 'ms' : (spell.cooldown / 1000).toFixed(1) + 's'}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      marginTop: 16, padding: 0, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${c.color}40`,
      background: `linear-gradient(180deg, ${c.color}08, rgba(0,0,0,0.5))`,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px',
        background: `linear-gradient(135deg, ${c.color}20, ${c.color}08)`,
        borderBottom: `1px solid ${c.color}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: `linear-gradient(135deg, ${c.color}40, ${c.secondaryColor || c.color}20)`,
              border: `2px solid ${c.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ width: 30, height: 30, color: c.secondaryColor || c.color, filter: `drop-shadow(0 0 4px ${c.color}80)` }}>
                {WIZARD_ICONS[c.iconStyle] || WIZARD_ICONS.star}
              </span>
            </div>
            <div>
              <div style={{ color: c.color, fontWeight: 700, fontSize: '1.2rem' }}>{c.name}</div>
              <div style={{ color: '#999', fontSize: '0.78rem', marginTop: 2 }}>{c.description}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <span style={{
              padding: '3px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
              background: isAI ? 'rgba(139,92,246,0.15)' : 'rgba(255,165,0,0.15)',
              border: `1px solid ${isAI ? 'rgba(139,92,246,0.4)' : 'rgba(255,165,0,0.4)'}`,
              color: isAI ? '#a78bfa' : '#f59e0b',
            }}>
              {isAI ? `🤖 ${modelLabel}` : '📋 Template'}
            </span>
            <StatPill label="HP" value={c.baseHealth} color="#ff6b6b" />
            <StatPill label="SPD" value={c.baseSpeed} color="#74c0fc" />
          </div>
        </div>
        
        {/* Lore */}
        {c.lore && (
          <div style={{
            color: '#777', fontSize: '0.72rem', fontStyle: 'italic',
            marginTop: 10, lineHeight: 1.5, paddingLeft: 2,
          }}>
            "{c.lore}"
          </div>
        )}
      </div>

      {/* Visual Style Badges */}
      {(c.bodyStyle || c.projectileShape || c.headgear) && (
        <div style={{ 
          display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 18px 10px',
        }}>
          {c.bodyStyle && c.bodyStyle !== 'wizard' && (
            <span style={{
              padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 600,
              background: `${c.color}12`, border: `1px solid ${c.color}25`, color: c.color,
            }}>
              {c.bodyStyle === 'hulk' ? '💪 Hulk' : c.bodyStyle === 'warrior' ? '⚔️ Warrior' : c.bodyStyle === 'archer' ? '🏹 Archer' : 
               c.bodyStyle === 'beast' ? '🐾 Beast' : c.bodyStyle === 'elemental' ? '✨ Elemental' : c.bodyStyle === 'creature' ? '👾 Creature' : '🧙 Wizard'}
            </span>
          )}
          {c.projectileShape && c.projectileShape !== 'orb' && (
            <span style={{
              padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#aaa',
            }}>
              {c.projectileShape === 'bolt' ? '⚡ Bolts' : c.projectileShape === 'thrown' ? '🎯 Thrown' : c.projectileShape === 'shard' ? '💎 Shards' : 
               c.projectileShape === 'wisp' ? '👻 Wisps' : c.projectileShape === 'arrow' ? '🏹 Arrows' : '🔮 Orbs'}
            </span>
          )}
          {c.headgear && c.headgear !== 'pointyHat' && (
            <span style={{
              padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#aaa',
            }}>
              {c.headgear === 'helmet' ? '🪖 Helmet' : c.headgear === 'hood' ? '🥷 Hood' : c.headgear === 'crown' ? '👑 Crown' : 
               c.headgear === 'horns' ? '😈 Horns' : c.headgear === 'antlers' ? '🦌 Antlers' : c.headgear === 'halo' ? '😇 Halo' : 
               c.headgear === 'ears' ? '🐱 Ears' : c.headgear === 'none' ? '—' : '🎩 Hat'}
            </span>
          )}
        </div>
      )}

      {/* Spells Section */}
      <div style={{ padding: '14px 18px' }}>
        <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Spells & Abilities
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Primary */}
          {primary && <SpellRow spell={primary} label="LMB" labelColor={c.color} />}
          {/* Secondary */}
          {secondary && <SpellRow spell={secondary} label="RMB" labelColor={c.secondaryColor} />}
          
          {/* Abilities */}
          {abilities.map((ab, i) => (
            <SpellRow key={ab.id} spell={ab} label={`Lv${[10,20,30][i]}`} labelColor={c.color} />
          ))}
        </div>
        
        {/* Dash + Ultimate row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {c.dashAbility && (
            <div style={{
              flex: 1, minWidth: 140, padding: '8px 10px',
              background: 'rgba(255,255,255,0.02)', borderRadius: 6,
              border: `1px solid ${c.color}20`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  padding: '2px 6px', background: `${c.color}20`, borderRadius: 3,
                  fontSize: '0.6rem', color: c.color, fontWeight: 700,
                }}>SHIFT</span>
                <span style={{ color: '#ddd', fontWeight: 600, fontSize: '0.78rem' }}>{c.dashAbility.name}</span>
              </div>
              <div style={{ color: '#666', fontSize: '0.68rem' }}>
                {c.dashAbility.description} · {(c.dashAbility.cooldown / 1000).toFixed(0)}s cd · {c.dashAbility.distance} dist
              </div>
            </div>
          )}
          {c.ultimateAbility && (
            <div style={{
              flex: 1, minWidth: 140, padding: '8px 10px',
              background: 'rgba(251,191,36,0.03)', borderRadius: 6,
              border: '1px solid rgba(251,191,36,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  padding: '2px 6px', background: 'rgba(251,191,36,0.15)', borderRadius: 3,
                  fontSize: '0.6rem', color: '#fbbf24', fontWeight: 700,
                }}>Q</span>
                <span style={{ color: '#ddd', fontWeight: 600, fontSize: '0.78rem' }}>{c.ultimateAbility.name}</span>
              </div>
              <div style={{ color: '#666', fontSize: '0.68rem' }}>
                {c.ultimateAbility.description} · {c.ultimateAbility.damage} dmg · {(c.ultimateAbility.cooldown / 1000).toFixed(0)}s cd
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Play Footer */}
      <div style={{
        padding: '16px 18px',
        background: `linear-gradient(135deg, ${c.color}10, rgba(0,0,0,0.3))`,
        borderTop: `1px solid ${c.color}15`,
      }}>
        {/* Wizard Name - prominent */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>
            Your Wizard's Name
          </label>
          <input
            style={{ 
              width: '100%', padding: '14px 18px',
              background: 'rgba(0,0,0,0.5)', 
              border: `2px solid ${playerName.trim() ? c.color + '60' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 10, color: '#fff', fontSize: '1.1rem', fontWeight: 600,
              textAlign: 'center', outline: 'none', boxSizing: 'border-box',
              letterSpacing: 0.5,
              transition: 'border-color 0.2s',
            }}
            type="text" placeholder="Enter a name for your wizard..." maxLength={20}
            value={playerName} onChange={(e) => setPlayerName(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = c.color}
            onBlur={(e) => e.target.style.borderColor = playerName.trim() ? c.color + '60' : 'rgba(255,255,255,0.15)'}
          />
        </div>
        <button
          onClick={onPlay}
          style={{
            width: '100%', padding: '14px 20px',
            background: `linear-gradient(135deg, ${c.color}, ${c.secondaryColor || c.color})`,
            border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: '1.05rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10,
            boxShadow: `0 4px 20px ${c.color}50`,
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = `0 6px 25px ${c.color}60`; }}
          onMouseLeave={(e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = `0 4px 20px ${c.color}50`; }}
        >
          <span style={{ fontSize: '1.2rem' }}>▶</span> Enter World as {c.name}
        </button>
        {!isAI && (
          <div style={{ color: '#f59e0b', fontSize: '0.7rem', textAlign: 'center', marginTop: 8, padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.15)' }}>
            ⚠️ AI unavailable — used template fallback. Results may not match your prompt. Try again or check server API key.
          </div>
        )}
      </div>
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
        borderRadius: 12, padding: 14, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isSelected ? `${c.color}25` : 'rgba(255,255,255,0.05)',
          border: `2px solid ${isSelected ? c.color : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ width: 22, height: 22, color: c.secondaryColor || c.color }}>
            {CLASS_SVG[id] || SVG.arcane}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: isSelected ? c.color : '#ddd', fontWeight: 700, fontSize: '0.95rem' }}>
            {c.name}
          </div>
          <div style={{ color: '#777', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.description}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>
        <span style={{ color: '#ff6b6b' }}>HP {c.baseHealth}</span>
        <span style={{ color: '#74c0fc' }}>SPD {c.baseSpeed}</span>
      </div>
      
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {c.dashAbility && (
          <span style={{ 
            padding: '3px 8px', background: `${c.color}15`, 
            border: `1px solid ${c.color}30`, borderRadius: 4, 
            fontSize: '0.65rem', color: c.secondaryColor || c.color,
          }}>
            ⚡ {c.dashAbility.name}
          </span>
        )}
        {c.ultimateAbility && (
          <span style={{ 
            padding: '3px 8px', background: 'rgba(251,191,36,0.1)', 
            border: '1px solid rgba(251,191,36,0.25)', borderRadius: 4, 
            fontSize: '0.65rem', color: '#fbbf24',
          }}>
            ✨ {c.ultimateAbility.name}
          </span>
        )}
      </div>
      
      {c.isAdmin && (
        <div style={{ 
          marginTop: 8, padding: '3px 8px', 
          background: 'rgba(239,68,68,0.15)', borderRadius: 4, 
          fontSize: '0.6rem', color: '#ef4444', textAlign: 'center',
        }}>
          ADMIN
        </div>
      )}
    </div>
  );
}
