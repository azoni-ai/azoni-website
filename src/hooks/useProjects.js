import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Fallback to static data if Firestore fails or is empty
import { projects as staticProjects, categories as staticCategories } from '../data/projects';

/**
 * Hook to fetch projects from Firestore with fallback to static data
 * Maintains same interface as original for Projects.jsx compatibility
 */
export const useProjects = (initialCategory = 'all') => {
  const [allProjects, setAllProjects] = useState([]);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'firestore' | 'static'

  // Categories - use static as default
  const categories = staticCategories || {
    all: "All Projects",
    ai: "AI & ML",
    fintech: "Fintech",
    web3: "Web3",
    web: "Web Apps",
    games: "Games"
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);

      if (snapshot.empty) {
        // No projects in Firestore, use static data
        console.log('No projects in Firestore, using static data');
        setAllProjects(staticProjects);
        setSource('static');
      } else {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by displayOrder (lower = first), then featured, then title
        projectsData.sort((a, b) => {
          // First by displayOrder if exists
          const orderA = a.displayOrder ?? 999;
          const orderB = b.displayOrder ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          // Then by featured
          if (a.featured !== b.featured) return b.featured ? 1 : -1;
          // Then alphabetically
          return a.title.localeCompare(b.title);
        });
        setAllProjects(projectsData);
        setSource('firestore');
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
      // Fall back to static data on error
      setAllProjects(staticProjects);
      setSource('static');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects by category
  const projects = useMemo(() => {
    if (activeCategory === 'all') {
      return allProjects;
    }
    return allProjects.filter(p => p.category === activeCategory);
  }, [allProjects, activeCategory]);

  // Change category handler
  const changeCategory = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  // Get a single project by ID
  const getProject = useCallback((id) => {
    return allProjects.find(p => p.id === id);
  }, [allProjects]);

  // Get featured projects only
  const getFeatured = useCallback(() => {
    return allProjects.filter(p => p.featured);
  }, [allProjects]);

  return {
    projects,          // Filtered by active category
    allProjects,       // All projects unfiltered
    categories,        // Category map
    activeCategory,    // Current filter
    changeCategory,    // Function to change filter
    loading,
    error,
    source,
    getProject,
    getFeatured,
    refresh: fetchProjects
  };
};

/**
 * Hook to fetch profile data from Firestore
 */
export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profileRef = doc(db, 'profile', 'main');
      const snapshot = await getDoc(profileRef);

      if (snapshot.exists()) {
        setProfile(snapshot.data());
      } else {
        // Default profile data if not in Firestore
        setProfile({
          aboutMe: 'Software engineer with 7+ years experience building production applications.',
          currentWork: 'Building AI-powered applications.',
          tagline: 'Software Engineer | AI Builder | Full-Stack Developer',
          skills: ['React', 'TypeScript', 'Python', 'AI/ML']
        });
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
      // Default on error
      setProfile({
        aboutMe: 'Software engineer with 7+ years experience building production applications.',
        currentWork: 'Building AI-powered applications.',
        tagline: 'Software Engineer | AI Builder | Full-Stack Developer',
        skills: ['React', 'TypeScript', 'Python', 'AI/ML']
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile
  };
};

/**
 * Hook for sync status and triggering sync
 */
export const usePortfolioSync = () => {
  const [status, setStatus] = useState({
    loading: true,
    hasUpdates: false,
    lastSyncedAt: null,
    reposOutdated: [],
    lastSummary: null
  });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/.netlify/functions/portfolio-sync');
      if (response.ok) {
        const data = await response.json();
        setStatus({ loading: false, ...data });
      } else {
        setStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Error checking sync status:', err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/.netlify/functions/portfolio-sync', {
        method: 'POST'
      });
      const data = await response.json();
      setSyncResult(data);
      await checkStatus();
    } catch (err) {
      console.error('Error triggering sync:', err);
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return {
    status,
    syncing,
    syncResult,
    checkStatus,
    triggerSync
  };
};

export default useProjects;