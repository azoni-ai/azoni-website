import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';

// Fallback to static data if Firestore fails
import { projects as staticProjects } from '../data/projects';

/**
 * Hook to fetch projects from Firestore with fallback to static data
 */
export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('loading'); // 'firestore' | 'static' | 'loading'

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, orderBy('featured', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Fall back to static data
        console.log('No projects in Firestore, using static data');
        setProjects(staticProjects);
        setSource('static');
      } else {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsData);
        setSource('firestore');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
      // Fall back to static data
      setProjects(staticProjects);
      setSource('static');
    } finally {
      setLoading(false);
    }
  };

  // Get a single project by ID
  const getProject = (id) => {
    return projects.find(p => p.id === id);
  };

  // Get featured projects only
  const getFeatured = () => {
    return projects.filter(p => p.featured);
  };

  // Get projects by category
  const getByCategory = (category) => {
    return projects.filter(p => p.category === category);
  };

  return {
    projects,
    loading,
    error,
    source,
    getProject,
    getFeatured,
    getByCategory,
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
      const profileRef = doc(db, 'profile', 'main');
      const snapshot = await getDoc(profileRef);

      if (snapshot.exists()) {
        setProfile(snapshot.data());
      } else {
        // Default profile data
        setProfile({
          aboutMe: 'Software engineer with 7+ years experience building production applications.',
          currentWork: 'Building AI-powered applications.',
          skills: ['React', 'TypeScript', 'Python', 'AI/ML']
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
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
      const data = await response.json();
      setStatus({
        loading: false,
        ...data
      });
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
      
      // Refresh status after sync
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
