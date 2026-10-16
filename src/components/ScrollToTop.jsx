import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - Resets scroll position on route change
 * Place this inside <Router> but outside <Routes>
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return undefined; }
    const scrollToSection = () => {
      const section = document.getElementById(id);
      if (!section) return false;
      section.scrollIntoView({ block: 'start', behavior: 'instant' });
      return true;
    };
    if (scrollToSection()) return undefined;
    // Lazy route content may mount after this effect.
    const observer = new MutationObserver(() => {
      if (scrollToSection()) observer.disconnect();
    });
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
