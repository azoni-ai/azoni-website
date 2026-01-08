import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// Create the context
const AppContext = createContext(null);

// Custom hook for using the context (with error handling)
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Provider component
export const AppProvider = ({ children }) => {
  // Theme state (could expand to full dark/light mode)
  const [theme, setTheme] = useState('dark');
  
  // Chat mode state (lifted from Chat.jsx for persistence across navigation)
  const [chatMode, setChatMode] = useState('professional');
  
  // User preferences (could be persisted to localStorage)
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
  });

  // Memoized theme toggle to prevent unnecessary re-renders
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Memoized preference updater
  const updatePreferences = useCallback((newPrefs) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    chatMode,
    setChatMode,
    preferences,
    updatePreferences,
  }), [theme, toggleTheme, chatMode, preferences, updatePreferences]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
