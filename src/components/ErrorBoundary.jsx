import React from 'react';

/**
 * Error Boundary component for catching render errors
 * Note: Error Boundaries must be class components (as of React 18)
 * 
 * Demonstrates: Class component lifecycle, error handling patterns
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (could send to error reporting service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Could send to error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
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
