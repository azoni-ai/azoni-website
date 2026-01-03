import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  return (
    <Link to={`/projects/${project.id}`} className="card project-card">
      <div 
        className="card-image"
        style={{ 
          background: `linear-gradient(135deg, var(--bg-elevated), var(--bg-card))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem'
        }}
      >
        {/* Placeholder - can be replaced with actual images */}
        {project.id === 'dumarket' && '📊'}
        {project.id === 'rowing-tracker' && '🚣'}
        {project.id === 'polymarket-tool' && '📈'}
        {project.id === 'discord-bots' && '🤖'}
        {project.id === 'dustbunny' && '🐰'}
        {project.id === 'adoh' && '⚔️'}
        {project.id === 'oli-fitness' && '💪'}
        {project.id === 'hashmaps' && '#️⃣'}
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
