import { useState, useMemo, useCallback } from 'react';
import { projects, categories, getProjectsByCategory } from '../data/projects';

/**
 * Custom hook for managing project filtering and retrieval
 * Demonstrates: useMemo for expensive computations, useCallback for stable references
 */
export const useProjects = (initialCategory = 'all') => {
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Memoize filtered projects to avoid recalculating on every render
  const filteredProjects = useMemo(() => {
    return getProjectsByCategory(activeCategory);
  }, [activeCategory]);

  // Memoize featured projects (expensive filter operation)
  const featuredProjects = useMemo(() => {
    return projects.filter(p => p.featured);
  }, []);

  // Stable callback for category changes
  const changeCategory = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  // Get a single project by ID
  const getProjectById = useCallback((id) => {
    return projects.find(p => p.id === id) || null;
  }, []);

  // Get related projects (same category, excluding current)
  const getRelatedProjects = useCallback((projectId, limit = 3) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    
    return projects
      .filter(p => p.id !== projectId && p.category === project.category)
      .slice(0, limit);
  }, []);

  return {
    projects: filteredProjects,
    allProjects: projects,
    featuredProjects,
    categories,
    activeCategory,
    changeCategory,
    getProjectById,
    getRelatedProjects,
  };
};

/**
 * Custom hook for a single project with related projects
 * Demonstrates: derived state, memoization
 */
export const useProject = (projectId) => {
  const { getProjectById, getRelatedProjects } = useProjects();

  const project = useMemo(() => {
    return getProjectById(projectId);
  }, [projectId, getProjectById]);

  const relatedProjects = useMemo(() => {
    return getRelatedProjects(projectId);
  }, [projectId, getRelatedProjects]);

  return {
    project,
    relatedProjects,
    isLoading: false, // Could be true if fetching from API
    error: project ? null : 'Project not found',
  };
};

export default useProjects;
