import React from 'react';

/**
 * Tutorial/Guide tab with controls, progression, zones, and tips
 */
export default function TutorialTab({ styles, SVG }) {
  return (
    <div style={{ ...styles.content, ...styles.tutorial, maxWidth: 650 }}>
      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.controls}</span> Controls
        </h3>
        <p style={styles.tutorialText}>
          <span style={styles.key}>WASD</span> Move wizard<br/>
          <span style={styles.key}>Click</span> Click to move / attack<br/>
          <span style={styles.key}>SPACE</span> Dash ability<br/>
          <span style={styles.key}>Q</span> Ultimate ability<br/>
          <span style={styles.key}>1 2 3</span> Class spells (unlock at Lv10, 20, 30)<br/>
          <span style={styles.key}>B</span> Spellbook — view all abilities &amp; stats<br/>
          <span style={styles.key}>E</span> Interact with NPCs / Portals<br/>
          <span style={styles.key}>C</span> Character sheet<br/>
          <span style={styles.key}>T</span> Emotes<br/>
          <span style={styles.key}>ESC</span> Close panels / Open settings<br/>
          <span style={{ fontSize: '0.85em', color: '#aaa', display: 'block', marginTop: 8 }}>
            Spells auto-cast at nearby enemies. Dash and Ultimate have cooldowns shown on the ability bar.
            Open your <span style={{ color: '#ffd93d' }}>Spellbook (B)</span> anytime to review ability details, damage values, and cooldowns.
          </span>
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.star}</span> Progression
        </h3>
        <p style={styles.tutorialText}>
          Defeat enemies to drop <span style={{ color: '#22c55e' }}>XP orbs</span> — walk over them to collect.
          Level up to unlock new <span style={{ color: '#a78bfa' }}>abilities</span> and <span style={{ color: '#ec4899' }}>skins</span>.<br/>
          <span style={{ color: '#ffd93d' }}>Boss Quest:</span> Defeat the boss in each zone to progress toward the Dragon fight.
          Check your quest log by clicking the quest bar in the HUD.
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.skull}</span> Dungeons
        </h3>
        <p style={styles.tutorialText}>
          Enter dungeon portals to face waves of enemies in confined arenas.
          Clear all waves to open the <span style={{ color: '#a78bfa' }}>victory portal</span> and claim bonus XP.<br/>
          <span style={{ color: '#ef4444' }}>Dragon Dungeon:</span> Defeat all 6 zone bosses to unlock the Dragon Dungeon portal in the Abyss.
          The Dragon is the ultimate challenge — good luck!
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.home}</span> Zones
        </h3>
        <p style={{ ...styles.tutorialText, marginBottom: 12 }}>
          The world is divided into zones of increasing difficulty. Stay near the <span style={{ color: '#22c55e' }}>Sanctuary</span> to heal.
        </p>
        <div style={styles.zoneList}>
          <ZoneItem styles={styles} color="#22c55e" icon={SVG.home} name="Sanctuary" desc="Safe zone — heal here" />
          <ZoneItem styles={styles} color="#84cc16" icon={SVG.star} name="Meadow (Lv1+)" desc="Slimes & Sprites" />
          <ZoneItem styles={styles} color="#166534" icon={SVG.arcane} name="Forest (Lv5+)" desc="Wolves & Treants" />
          <ZoneItem styles={styles} color="#dc2626" icon={SVG.fire} name="Volcanic (Lv10+)" desc="Fire elementals & Lava" />
          <ZoneItem styles={styles} color="#0ea5e9" icon={SVG.ice} name="Frozen (Lv15+)" desc="Ice spirits & Frost" />
          <ZoneItem styles={styles} color="#7c3aed" icon={SVG.crystal || SVG.arcane} name="Crystal Caves (Lv18+)" desc="Crystal golems & Arcane beasts" />
          <ZoneItem styles={styles} color="#581c87" icon={SVG.skull} name="Abyss (Lv20+)" desc="Void creatures & Bosses" />
        </div>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.wand || SVG.arcane}</span> Custom Wizards
        </h3>
        <p style={styles.tutorialText}>
          Use the <span style={{ color: '#a78bfa' }}>AI Wizard Creator</span> on the Create tab to design a unique wizard class.
          Describe your vision and AI will generate custom spells, stats, and abilities.
          Open your <span style={{ color: '#ffd93d' }}>Spellbook (B)</span> in-game to review all your abilities and their details.
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.heart}</span> Quick Keys
        </h3>
        <p style={styles.tutorialText}>
          <span style={styles.key}>B</span> Spellbook<br/>
          <span style={styles.key}>C</span> Character sheet<br/>
          <span style={styles.key}>T</span> Emote wheel<br/>
          <span style={styles.key}>E</span> Interact<br/>
          <span style={styles.key}>ESC</span> Settings / Close panels<br/>
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.heart}</span> Tips
        </h3>
        <p style={styles.tutorialText}>
          <span style={{ color: '#ffd93d' }}>•</span> Return to Sanctuary when low on HP — it heals you over time.<br/>
          <span style={{ color: '#ffd93d' }}>•</span> Use Dash to dodge boss attacks and reposition quickly.<br/>
          <span style={{ color: '#ffd93d' }}>•</span> Group up with other players for tough boss fights.<br/>
          <span style={{ color: '#ffd93d' }}>•</span> Each class plays differently — try a few to find your style.<br/>
          <span style={{ color: '#ffd93d' }}>•</span> Dungeon rewards scale with difficulty — harder = more XP.<br/>
          <span style={{ color: '#ffd93d' }}>•</span> Check your Spellbook (B) to learn your abilities' stats and cooldowns.
        </p>
      </div>
    </div>
  );
}

function ZoneItem({ styles, color, icon, name, desc }) {
  return (
    <div style={styles.zoneItem(color)}>
      <span style={{ ...styles.zoneItemIcon, color }}>{icon}</span>
      <div>
        <h4 style={{ fontSize: '.9rem', marginBottom: 4, color: '#ddd' }}>{name}</h4>
        <p style={{ fontSize: '.8rem', color: '#aaa' }}>{desc}</p>
      </div>
    </div>
  );
}