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
    // Static data is the source of truth (edited via src/data/projects.js).
    // Firestore is queried only to enrich with live runtime fields (e.g.
    // view counts, star counts) that don't belong in the codebase. Static
    // copy/tagline/description/etc. always wins.
    try {
      setLoading(true);

      let firestoreEnrichment = {};
      try {
        const snapshot = await getDocs(collection(db, 'projects'));
        snapshot.docs.forEach((d) => {
          const data = d.data() || {};
          // Only keep runtime/state fields, not editorial copy.
          firestoreEnrichment[d.id] = {
            views: data.views,
            starCount: data.starCount,
          };
        });
      } catch (fireErr) {
        console.warn('Firestore enrichment skipped:', fireErr.message);
      }

      const merged = staticProjects.map((p) => ({
        ...p,
        ...(firestoreEnrichment[p.id] || {}),
      }));

      merged.sort((a, b) => {
        const orderA = a.displayOrder ?? 999;
        const orderB = b.displayOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        return a.title.localeCompare(b.title);
      });

      setAllProjects(merged);
      setSource('static');
      setError(null);
    } catch (err) {
      console.error('Error preparing projects:', err);
      setError(err.message);
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