import React from 'react';
import { Link } from 'react-router-dom';

const FALLBACK_LABELS = {
  'scryfall-ai': 'SA',
  'old-ways-today': 'OW',
  'azoni-ai': 'AI',
  'azoni-mcp': 'MCP',
  'moltbook-agent': 'MB',
  dumarket: 'DM',
  'row-crew': 'RC',
  'polymarket-tool': 'PM',
  'discord-bots': 'BOT',
  dustbunny: 'DB',
  adoh: 'NWN',
  'oli-fitness': 'OLI',
  hashmaps: 'HM',
  'fab-stats': 'FAB',
  'spell-brigade': 'SB',
  'image-pipeline-api': 'IPA',
  launchpad: 'LP',
  meeplematch: 'MM',
  blackdiamond: 'BD',
  benchmark: 'BM',
  repmatch: 'RM',
  'crypto-tax-2025': 'TAX',
  pyroguard: 'PG',
  dayrun: 'DAY',
  macromarket: 'MKT'
};

const ProjectCard = ({ project }) => {
  const [imageError, setImageError] = React.useState(false);
  const fallbackLabel = FALLBACK_LABELS[project.id] || 'APP';

  return (
    <Link to={`/projects/${project.id}`} className="card project-card">
      <div 
        className="card-image"
        style={{ 
          background: `linear-gradient(135deg, var(--bg-elevated), var(--bg-card))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          overflow: 'hidden'
        }}
      >
        {project.image && !imageError ? (
          <img 
            src={project.image} 
            alt={project.title}
            onError={() => setImageError(true)}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)'
            }}
          />
        ) : (
          fallbackLabel
        )}
      </div>
      
      <h3 className="card-title">{project.title}</h3>
      <p className="card-subtitle">{project.tagline}</p>
      <p className="card-description">{project.description}</p>
      
      <div className="tags">
        {project.tech.slice(0, 4).map((tech) => (
          <span key={tech} className="tag">{tech}</span>
        ))}
      </div>
    </Link>
  );
};

export default ProjectCard;
