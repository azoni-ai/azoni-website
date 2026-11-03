import React from 'react';

// A tab opened before a deploy still asks for the old build's page chunks,
// which the deploy removed. Reload to pick up the new build. The time of the
// last reload, kept for the session, stops a reload loop when a chunk keeps
// failing for another reason; a tab left open across a later deploy can still
// reload again once the cooldown has passed.
export const CHUNK_RELOAD_KEY = 'azoni-chunk-reload';
const RELOAD_COOLDOWN_MS = 30 * 1000;

const isChunkLoadError = (error) =>
  error?.name === 'ChunkLoadError' || /Loading (CSS )?chunk \S+ failed/.test(error?.message || '');

const shouldReloadFor = (error) => {
  if (!isChunkLoadError(error)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0;
    return Date.now() - last > RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
};

/**
 * Error Boundary component for catching render errors
 * Note: Error Boundaries must be class components (as of React 18)
 *
 * Demonstrates: Class component lifecycle, error handling patterns
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reloading: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, reloading: shouldReloadFor(error) };
  }

  componentDidCatch(error, errorInfo) {
    if (this.state.reloading) {
      try {
        window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      } catch {
        // shouldReloadFor already returned false when storage is unavailable.
      }
      window.location.reload();
      return;
    }

    // Log error to console (could send to error reporting service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Could send to error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, reloading: false });
  };

  render() {
    if (this.state.hasError) {
      // Reloading onto the new build; showing the error would only flash.
      if (this.state.reloading) {
        return null;
      }

      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                <summary>Error Details</summary>
                <pre style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '0.85rem'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
