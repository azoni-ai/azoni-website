import React from 'react';

/**
 * Tutorial/Guide tab with controls and zone information
 */
export default function TutorialTab({ styles, SVG }) {
  return (
    <div style={{ ...styles.content, ...styles.tutorial, maxWidth: 600 }}>
      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.controls}</span> Controls
        </h3>
        <p style={styles.tutorialText}>
          <span style={styles.key}>WASD</span> Move wizard<br/>
          <span style={styles.key}>Click</span> Click to move<br/>
          <span style={styles.key}>SPACE</span> Dash ability<br/>
          <span style={styles.key}>Q</span> Ultimate ability<br/>
          <span style={styles.key}>1 2 3</span> Class abilities (unlock at Lv10, 20, 30)<br/>
          <span style={styles.key}>E</span> Interact with NPCs/Portals<br/>
          <span style={styles.key}>C</span> Character sheet<br/>
          <span style={styles.key}>T</span> Emotes<br/>
          <span style={styles.key}>ESC</span> Settings<br/>
          <span style={{ fontSize: '0.8em', color: '#888' }}>Spells auto-cast at nearby enemies</span>
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.star}</span> Progression
        </h3>
        <p style={styles.tutorialText}>
          Kill enemies, collect XP orbs, level up, unlock skins! Visit the Shop to spend gold on health, mana, and damage upgrades. Costs scale up as you buy more!
        </p>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.home}</span> Zones
        </h3>
        <div style={styles.zoneList}>
          <ZoneItem styles={styles} color="#22c55e" icon={SVG.home} name="Sanctuary" desc="Safe zone" />
          <ZoneItem styles={styles} color="#84cc16" icon={SVG.star} name="Meadow (Lv1)" desc="Easy" />
          <ZoneItem styles={styles} color="#166534" icon={SVG.arcane} name="Forest (Lv5)" desc="Medium" />
          <ZoneItem styles={styles} color="#dc2626" icon={SVG.fire} name="Volcanic (Lv10)" desc="Hard" />
          <ZoneItem styles={styles} color="#0ea5e9" icon={SVG.ice} name="Frozen (Lv15)" desc="Harder" />
          <ZoneItem styles={styles} color="#ec4899" icon={SVG.star} name="Crystal Caves (Lv18)" desc="Very Hard" />
          <ZoneItem styles={styles} color="#581c87" icon={SVG.skull} name="Abyss (Lv20)" desc="Bosses!" />
        </div>
      </div>

      <div style={styles.tutorialSection}>
        <h3 style={styles.tutorialTitle}>
          <span style={styles.tutorialIcon}>{SVG.skull}</span> Tips
        </h3>
        <p style={styles.tutorialText}>
          Watch for warning circles on the ground - dodge them! Bosses have powerful attacks with visual telegraphs. Press ESC to close menus or open settings.
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
        <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>{name}</h4>
        <p style={{ fontSize: '.75rem', color: '#888' }}>{desc}</p>
      </div>
    </div>
  );
}
