import React from 'react';
import { Link } from 'react-router-dom';

const FALLBACK_EMOJIS = {
  'scryfall-ai': '🃏',
  'old-ways-today': '🌿',
  'dumarket': '📊',
  'rowing-tracker': '🚣',
  'polymarket-tool': '📈',
  'discord-bots': '🤖',
  'dustbunny': '🐰',
  'adoh': '⚔️',
  'oli-fitness': '💪',
  'hashmaps': '#️⃣'
};

const ProjectCard = ({ project }) => {
  const [imageError, setImageError] = React.useState(false);
  const fallbackEmoji = FALLBACK_EMOJIS[project.id] || '📁';

  return (
    <Link to={`/projects/${project.id}`} className="card project-card">
      <div 
        className="card-image"
        style={{ 
          background: `linear-gradient(135deg, var(--bg-elevated), var(--bg-card))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
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
          fallbackEmoji
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