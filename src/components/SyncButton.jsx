import React from 'react';
import { usePortfolioSync } from '../hooks/useProjects';

/**
 * Portfolio Sync Widget
 * 
 * Shows sync status and allows visitors to trigger updates
 * Demonstrates "building in public" by showing real-time GitHub integration
 */
const SyncButton = ({ compact = false }) => {
  const { status, syncing, syncResult, triggerSync } = usePortfolioSync();

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (status.loading) {
    return (
      <div className="sync-widget">
        <div className="sync-status sync-checking">
          <span className="sync-dot"></span>
          Checking for updates...
        </div>
      </div>
    );
  }

  // Compact version for navbar or footer
  if (compact) {
    return (
      <div className="sync-widget-compact">
        {status.hasUpdates ? (
          <button 
            className="sync-btn-compact has-updates"
            onClick={triggerSync}
            disabled={syncing}
            title="New commits detected - click to sync"
          >
            {syncing ? '↻' : '✨'} 
          </button>
        ) : (
          <span className="sync-current-compact" title={`Last synced: ${formatTimeAgo(status.lastSyncedAt)}`}>
            ✓
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="sync-widget">
      {/* Status line */}
      <div className="sync-status">
        <span className={`sync-dot ${status.hasUpdates ? 'has-updates' : 'current'}`}></span>
        <span className="sync-time">
          Last synced: {formatTimeAgo(status.lastSyncedAt)}
        </span>
      </div>

      {/* Sync button or current status */}
      {status.hasUpdates ? (
        <button 
          className="sync-button has-updates"
          onClick={triggerSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <span className="sync-spinner">↻</span>
              Syncing...
            </>
          ) : (
            <>
              <span className="sync-icon">✨</span>
              New commits detected! Sync Now
            </>
          )}
        </button>
      ) : (
        <div className="sync-current">
          <span className="sync-check">✓</span>
          Up to date
        </div>
      )}

      {/* Repos that need updating */}
      {status.hasUpdates && status.reposOutdated?.length > 0 && !syncing && (
        <div className="sync-repos">
          Updates in: {status.reposOutdated.join(', ')}
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className={`sync-result ${syncResult.error ? 'error' : 'success'}`}>
          {syncResult.error ? (
            <span>Error: {syncResult.error}</span>
          ) : syncResult.updated ? (
            <>
              <span className="sync-result-title">Updated!</span>
              <p className="sync-summary">{syncResult.summary}</p>
              {syncResult.projectsUpdated?.length > 0 && (
                <span className="sync-detail">
                  Projects: {syncResult.projectsUpdated.join(', ')}
                </span>
              )}
            </>
          ) : (
            <span>No updates needed</span>
          )}
        </div>
      )}

      {/* Last summary if no new updates */}
      {!status.hasUpdates && status.lastSummary && (
        <div className="sync-last-summary">
          <span className="sync-summary-label">Recent activity:</span>
          <p className="sync-summary">{status.lastSummary}</p>
        </div>
      )}
    </div>
  );
};

export default SyncButton;
