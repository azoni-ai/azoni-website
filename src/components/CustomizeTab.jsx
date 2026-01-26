/**
 * CustomizeTab - Admin Panel Tab for Content Management
 * 
 * Add this to Admin.jsx:
 * 1. Import: const CustomizeTab = React.lazy(() => import('./CustomizeTab'));
 * 2. Add tab button in admin-main-tabs div
 * 3. Add: {activeTab === 'customize' && <CustomizeTab />}
 * 
 * Or just paste this component at the bottom of Admin.jsx before the export
 */

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

// ============ CUSTOMIZE TAB ============
const CustomizeTab = () => {
  const [subTab, setSubTab] = useState('profile');
  
  return (
    <div className="customize-tab">
      <div className="customize-header">
        <h3>🎨 Customize Content</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Manage profile, projects, and sync settings
        </p>
      </div>

      <div className="customize-subtabs">
        <button 
          className={`customize-subtab ${subTab === 'profile' ? 'active' : ''}`}
          onClick={() => setSubTab('profile')}
        >
          👤 Profile
        </button>
        <button 
          className={`customize-subtab ${subTab === 'projects' ? 'active' : ''}`}
          onClick={() => setSubTab('projects')}
        >
          📁 Projects
        </button>
        <button 
          className={`customize-subtab ${subTab === 'sync' ? 'active' : ''}`}
          onClick={() => setSubTab('sync')}
        >
          🔄 Sync
        </button>
        <button 
          className={`customize-subtab ${subTab === 'migrate' ? 'active' : ''}`}
          onClick={() => setSubTab('migrate')}
        >
          📦 Migrate
        </button>
      </div>

      {subTab === 'profile' && <ProfileEditor />}
      {subTab === 'projects' && <ProjectsManager />}
      {subTab === 'sync' && <SyncManager />}
      {subTab === 'migrate' && <MigrateManager />}
    </div>
  );
};

// ============ PROFILE EDITOR ============
const ProfileEditor = () => {
  const [profile, setProfile] = useState({
    aboutMe: '',
    currentWork: '',
    tagline: '',
    skills: [],
    contact: {
      email: '',
      linkedin: '',
      github: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'profile', 'main');
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        setProfile(prev => ({ ...prev, ...snapshot.data() }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'profile', 'main'), {
        ...profile,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      alert('Profile saved!');
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  if (loading) {
    return <div className="customize-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-editor">
      <div className="editor-section">
        <label className="editor-label">Tagline</label>
        <input
          type="text"
          className="editor-input"
          placeholder="Software Engineer | AI Enthusiast | Builder"
          value={profile.tagline || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, tagline: e.target.value }))}
        />
      </div>

      <div className="editor-section">
        <label className="editor-label">About Me</label>
        <textarea
          className="editor-textarea"
          placeholder="Write your bio here..."
          rows={6}
          value={profile.aboutMe || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, aboutMe: e.target.value }))}
        />
        <span className="editor-hint">This appears on your homepage and in RAG responses</span>
      </div>

      <div className="editor-section">
        <label className="editor-label">Current Work</label>
        <textarea
          className="editor-textarea"
          placeholder="What are you currently working on?"
          rows={3}
          value={profile.currentWork || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, currentWork: e.target.value }))}
        />
        <span className="editor-hint">Auto-updated by sync, but you can edit manually</span>
      </div>

      <div className="editor-section">
        <label className="editor-label">Skills</label>
        <div className="skills-input-row">
          <input
            type="text"
            className="editor-input"
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <button className="btn btn-secondary btn-sm" onClick={addSkill}>Add</button>
        </div>
        <div className="skills-tags">
          {profile.skills?.map(skill => (
            <span key={skill} className="skill-tag">
              {skill}
              <button className="skill-remove" onClick={() => removeSkill(skill)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <label className="editor-label">Contact</label>
        <div className="contact-fields">
          <input
            type="email"
            className="editor-input"
            placeholder="Email"
            value={profile.contact?.email || ''}
            onChange={(e) => setProfile(prev => ({ 
              ...prev, 
              contact: { ...prev.contact, email: e.target.value }
            }))}
          />
          <input
            type="text"
            className="editor-input"
            placeholder="LinkedIn URL"
            value={profile.contact?.linkedin || ''}
            onChange={(e) => setProfile(prev => ({ 
              ...prev, 
              contact: { ...prev.contact, linkedin: e.target.value }
            }))}
          />
          <input
            type="text"
            className="editor-input"
            placeholder="GitHub URL"
            value={profile.contact?.github || ''}
            onChange={(e) => setProfile(prev => ({ 
              ...prev, 
              contact: { ...prev.contact, github: e.target.value }
            }))}
          />
        </div>
      </div>

      <div className="editor-actions">
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  );
};

// ============ PROJECTS MANAGER ============
const ProjectsManager = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const emptyProject = {
    id: '',
    title: '',
    tagline: '',
    description: '',
    longDescription: '',
    tech: [],
    highlights: [],
    links: { live: '', github: '' },
    image: '',
    featured: false,
    category: 'ai',
    syncEnabled: false,
    syncRepo: ''
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'projects'), orderBy('featured', 'desc'));
      const snapshot = await getDocs(q);
      const projectsData = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingProject({ ...emptyProject });
    setShowEditor(true);
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    
    try {
      await deleteDoc(doc(db, 'projects', project.docId));
      await loadProjects();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const handleSave = async (projectData) => {
    try {
      const { docId, ...data } = projectData;
      
      // Use id as document ID for new projects
      const projectDocId = docId || data.id;
      
      if (!projectDocId) {
        alert('Project ID is required');
        return;
      }

      await setDoc(doc(db, 'projects', projectDocId), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setShowEditor(false);
      setEditingProject(null);
      await loadProjects();
    } catch (err) {
      alert('Error saving: ' + err.message);
    }
  };

  if (loading) {
    return <div className="customize-loading">Loading projects...</div>;
  }

  if (showEditor) {
    return (
      <ProjectEditor 
        project={editingProject}
        onSave={handleSave}
        onCancel={() => { setShowEditor(false); setEditingProject(null); }}
      />
    );
  }

  return (
    <div className="projects-manager">
      <div className="projects-header">
        <span>{projects.length} projects</span>
        <button className="btn btn-primary btn-sm" onClick={handleNew}>
          + Add Project
        </button>
      </div>

      <div className="projects-list">
        {projects.map(project => (
          <div key={project.docId} className="project-card-admin">
            <div className="project-card-info">
              <div className="project-card-title">
                {project.featured && <span className="featured-badge">⭐</span>}
                {project.title}
              </div>
              <div className="project-card-tagline">{project.tagline}</div>
              <div className="project-card-description">{project.description}</div>
              {project.syncEnabled && (
                <div className="project-sync-badge">
                  🔄 Syncs with {project.syncRepo}
                </div>
              )}
              {project.recentUpdates && (
                <div className="project-recent-updates">
                  <strong>Recent:</strong> {project.recentUpdates.substring(0, 100)}...
                </div>
              )}
            </div>
            <div className="project-card-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(project)}>
                Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(project)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ PROJECT EDITOR ============
const ProjectEditor = ({ project, onSave, onCancel }) => {
  const [form, setForm] = useState(project);
  const [techInput, setTechInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const addTech = () => {
    if (techInput.trim() && !form.tech?.includes(techInput.trim())) {
      setForm(prev => ({ ...prev, tech: [...(prev.tech || []), techInput.trim()] }));
      setTechInput('');
    }
  };

  const removeTech = (tech) => {
    setForm(prev => ({ ...prev, tech: prev.tech.filter(t => t !== tech) }));
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setForm(prev => ({ ...prev, highlights: [...(prev.highlights || []), highlightInput.trim()] }));
      setHighlightInput('');
    }
  };

  const removeHighlight = (index) => {
    setForm(prev => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== index) }));
  };

  return (
    <div className="project-editor">
      <div className="editor-header">
        <h4>{project.docId ? 'Edit Project' : 'New Project'}</h4>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>← Back</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Project ID *</label>
            <input
              type="text"
              className="editor-input"
              placeholder="my-project (URL-friendly)"
              value={form.id || ''}
              onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              disabled={!!project.docId}
              required
            />
            <span className="editor-hint">Used in URLs, cannot be changed later</span>
          </div>

          <div className="editor-section">
            <label className="editor-label">Title *</label>
            <input
              type="text"
              className="editor-input"
              placeholder="My Awesome Project"
              value={form.title || ''}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-label">Tagline</label>
          <input
            type="text"
            className="editor-input"
            placeholder="One-line description"
            value={form.tagline || ''}
            onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
          />
        </div>

        <div className="editor-section">
          <label className="editor-label">Card Description</label>
          <textarea
            className="editor-textarea"
            placeholder="Short description shown on homepage cards..."
            rows={3}
            value={form.description || ''}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <span className="editor-hint">This appears on homepage project cards</span>
        </div>

        <div className="editor-section">
          <label className="editor-label">Full Description</label>
          <textarea
            className="editor-textarea"
            placeholder="Detailed project description..."
            rows={8}
            value={form.longDescription || ''}
            onChange={(e) => setForm(prev => ({ ...prev, longDescription: e.target.value }))}
          />
          <span className="editor-hint">Shown on project detail page. Supports markdown-style formatting.</span>
        </div>

        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Live URL</label>
            <input
              type="url"
              className="editor-input"
              placeholder="https://..."
              value={form.links?.live || ''}
              onChange={(e) => setForm(prev => ({ 
                ...prev, 
                links: { ...prev.links, live: e.target.value }
              }))}
            />
          </div>

          <div className="editor-section">
            <label className="editor-label">GitHub URL</label>
            <input
              type="url"
              className="editor-input"
              placeholder="https://github.com/..."
              value={form.links?.github || ''}
              onChange={(e) => setForm(prev => ({ 
                ...prev, 
                links: { ...prev.links, github: e.target.value }
              }))}
            />
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-label">Tech Stack</label>
          <div className="skills-input-row">
            <input
              type="text"
              className="editor-input"
              placeholder="Add technology..."
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addTech}>Add</button>
          </div>
          <div className="skills-tags">
            {form.tech?.map(tech => (
              <span key={tech} className="skill-tag">
                {tech}
                <button type="button" className="skill-remove" onClick={() => removeTech(tech)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-label">Highlights</label>
          <div className="skills-input-row">
            <input
              type="text"
              className="editor-input"
              placeholder="Add highlight..."
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addHighlight}>Add</button>
          </div>
          <div className="highlights-list">
            {form.highlights?.map((highlight, index) => (
              <div key={index} className="highlight-item">
                <span>• {highlight}</span>
                <button type="button" className="skill-remove" onClick={() => removeHighlight(index)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-section">
            <label className="editor-label">Image Path</label>
            <input
              type="text"
              className="editor-input"
              placeholder="/images/project.svg"
              value={form.image || ''}
              onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
            />
          </div>

          <div className="editor-section">
            <label className="editor-label">Category</label>
            <select
              className="editor-select"
              value={form.category || 'ai'}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="ai">AI / ML</option>
              <option value="web">Web App</option>
              <option value="mobile">Mobile</option>
              <option value="tool">Developer Tool</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="editor-section">
          <label className="editor-checkbox-label">
            <input
              type="checkbox"
              checked={form.featured || false}
              onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
            />
            Featured Project (shows prominently on homepage)
          </label>
        </div>

        <div className="editor-section sync-settings">
          <label className="editor-label">🔄 Auto-Sync Settings</label>
          <label className="editor-checkbox-label">
            <input
              type="checkbox"
              checked={form.syncEnabled || false}
              onChange={(e) => setForm(prev => ({ ...prev, syncEnabled: e.target.checked }))}
            />
            Enable auto-sync from GitHub
          </label>
          {form.syncEnabled && (
            <input
              type="text"
              className="editor-input"
              placeholder="Repository name (e.g., my-repo)"
              value={form.syncRepo || ''}
              onChange={(e) => setForm(prev => ({ ...prev, syncRepo: e.target.value }))}
            />
          )}
        </div>

        {form.recentUpdates && (
          <div className="editor-section">
            <label className="editor-label">Recent Updates (auto-generated)</label>
            <div className="recent-updates-preview">{form.recentUpdates}</div>
          </div>
        )}

        <div className="editor-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============ SYNC MANAGER ============
const SyncManager = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/portfolio-sync');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      setResult(null);
      const response = await fetch('/.netlify/functions/portfolio-sync', { method: 'POST' });
      const data = await response.json();
      setResult(data);
      await checkStatus();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="customize-loading">Checking sync status...</div>;
  }

  return (
    <div className="sync-manager">
      <div className="sync-status-card">
        <h4>📊 Sync Status</h4>
        <div className="sync-status-grid">
          <div className="sync-stat">
            <span className="sync-stat-label">Last Synced</span>
            <span className="sync-stat-value">{formatDate(status?.lastSyncedAt)}</span>
          </div>
          <div className="sync-stat">
            <span className="sync-stat-label">Status</span>
            <span className={`sync-stat-value ${status?.hasUpdates ? 'has-updates' : 'current'}`}>
              {status?.hasUpdates ? '⚠️ Updates Available' : '✓ Up to Date'}
            </span>
          </div>
        </div>

        {status?.reposOutdated?.length > 0 && (
          <div className="sync-repos-outdated">
            <strong>Repos with new commits:</strong>
            <ul>
              {status.reposOutdated.map(repo => (
                <li key={repo}>{repo}</li>
              ))}
            </ul>
          </div>
        )}

        {status?.lastSummary && (
          <div className="sync-last-summary">
            <strong>Last sync summary:</strong>
            <p>{status.lastSummary}</p>
          </div>
        )}
      </div>

      <div className="sync-actions">
        <button 
          className="btn btn-primary"
          onClick={triggerSync}
          disabled={syncing}
        >
          {syncing ? '🔄 Syncing...' : '🔄 Sync Now'}
        </button>
        <button 
          className="btn btn-secondary"
          onClick={checkStatus}
          disabled={loading}
        >
          🔍 Refresh Status
        </button>
      </div>

      {result && (
        <div className={`sync-result-card ${result.error ? 'error' : 'success'}`}>
          {result.error ? (
            <p>❌ Error: {result.error}</p>
          ) : result.updated ? (
            <>
              <p>✅ Sync Complete!</p>
              <p><strong>Summary:</strong> {result.summary}</p>
              {result.projectsUpdated?.length > 0 && (
                <p><strong>Projects updated:</strong> {result.projectsUpdated.join(', ')}</p>
              )}
              {result.ragChunksUpdated?.length > 0 && (
                <p><strong>RAG chunks updated:</strong> {result.ragChunksUpdated.length}</p>
              )}
            </>
          ) : (
            <p>ℹ️ No updates needed</p>
          )}
        </div>
      )}

      <div className="sync-info">
        <h4>How it works</h4>
        <ol>
          <li>Checks GitHub repos (azoni-portfolio, benchpressonly, row-crew) for new commits</li>
          <li>Fetches commit messages since last sync</li>
          <li>Uses GPT-4o-mini to summarize changes</li>
          <li>Updates project descriptions, RAG chunks, and profile</li>
        </ol>
        <p className="sync-cost">Cost: ~$0.001 per sync</p>
      </div>
    </div>
  );
};

// ============ MIGRATE MANAGER ============
const MigrateManager = () => {
  const [status, setStatus] = useState({
    projects: { count: 0, loaded: false },
    profile: { exists: false, loaded: false }
  });
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check projects
      const projectsSnap = await getDocs(collection(db, 'projects'));
      
      // Check profile
      const profileSnap = await getDoc(doc(db, 'profile', 'main'));
      
      setStatus({
        projects: { count: projectsSnap.size, loaded: true },
        profile: { exists: profileSnap.exists(), loaded: true }
      });
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  const migrateProjects = async () => {
    if (!window.confirm('This will create sample projects in Firestore. Continue?')) return;
    
    try {
      setMigrating(true);
      
      // Call the migration endpoint
      const response = await fetch('/.netlify/functions/rag-admin/migrate-projects', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Migration endpoint not available. Add migrate-projects action to rag-admin.js');
      }
      
      const data = await response.json();
      setResult(data);
      await checkStatus();
    } catch (err) {
      // Fallback: create basic structure directly
      setResult({ error: err.message, hint: 'You may need to add the migrate-projects endpoint to rag-admin.js' });
    } finally {
      setMigrating(false);
    }
  };

  const createSampleProfile = async () => {
    try {
      setMigrating(true);
      await setDoc(doc(db, 'profile', 'main'), {
        aboutMe: 'Software engineer with 7+ years of experience building production applications. Based in Seattle, Washington.',
        currentWork: 'Building AI-powered applications and tools.',
        tagline: 'Software Engineer | AI Builder | Full-Stack Developer',
        skills: ['React', 'TypeScript', 'Python', 'Firebase', 'AI/ML', 'RAG Systems'],
        contact: {
          email: 'charltonuw@gmail.com',
          linkedin: 'linkedin.com/in/charltonsmith',
          github: 'github.com/azoni'
        },
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      setResult({ message: 'Profile created!' });
      await checkStatus();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="migrate-manager">
      <div className="migrate-status">
        <h4>📦 Database Status</h4>
        
        <div className="migrate-status-grid">
          <div className="migrate-stat">
            <span className="migrate-stat-label">Projects Collection</span>
            <span className="migrate-stat-value">
              {status.projects.loaded 
                ? `${status.projects.count} projects` 
                : 'Loading...'}
            </span>
          </div>
          
          <div className="migrate-stat">
            <span className="migrate-stat-label">Profile Document</span>
            <span className="migrate-stat-value">
              {status.profile.loaded 
                ? (status.profile.exists ? '✓ Exists' : '✗ Not found')
                : 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="migrate-actions">
        <div className="migrate-action">
          <h5>Initialize Profile</h5>
          <p>Create the profile document with default values</p>
          <button 
            className="btn btn-secondary"
            onClick={createSampleProfile}
            disabled={migrating}
          >
            {migrating ? 'Creating...' : 'Create Profile'}
          </button>
        </div>

        <div className="migrate-action">
          <h5>Migrate Projects</h5>
          <p>Move projects from static file to Firestore</p>
          <button 
            className="btn btn-secondary"
            onClick={migrateProjects}
            disabled={migrating}
          >
            {migrating ? 'Migrating...' : 'Migrate Projects'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`migrate-result ${result.error ? 'error' : 'success'}`}>
          {result.error ? (
            <>
              <p>❌ {result.error}</p>
              {result.hint && <p className="hint">{result.hint}</p>}
            </>
          ) : (
            <p>✅ {result.message || 'Migration complete!'}</p>
          )}
        </div>
      )}

      <div className="migrate-info">
        <h4>About Migration</h4>
        <p>
          Moving content to Firestore allows the auto-sync system to update your projects 
          and profile dynamically based on GitHub activity.
        </p>
        <p>
          After migration, your projects will be fetched from Firestore instead of the 
          static projects.js file.
        </p>
      </div>
    </div>
  );
};

export default CustomizeTab;
