import React from 'react';

/**
 * Loading component for Suspense fallbacks
 * Simple, accessible loading indicator
 */
const Loading = ({ message = 'Loading...', fullScreen = false }) => {
  const content = (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true">
        <div className="spinner"></div>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;
