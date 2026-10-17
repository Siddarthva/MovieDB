import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Shown when data could not be loaded. Says what failed and offers a retry; never shows stale or bundled data.
 * `error` is an ApiError (or any Error).
 */
export default function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  const offline = error?.kind === 'network';
  const heading = offline ? 'Cannot reach the service' : title;
  return (
    <div role="alert" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', padding: 'var(--space-5)' }}>
      <div className="surface" style={{ width: 'min(520px, 100%)', padding: 'var(--space-6)', textAlign: 'center', borderColor: 'rgba(251,191,36,0.35)' }}>
        <AlertTriangle aria-hidden="true" style={{ width: 28, height: 28, color: 'var(--color-warning)', margin: '0 auto var(--space-3)' }} />
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>{heading}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        {error?.requestId && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>Reference: {error.requestId}</p>
        )}
        {error?.retryable !== false && onRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry} style={{ marginTop: 'var(--space-5)' }}>
            <RefreshCw aria-hidden="true" style={{ width: 14, height: 14 }} /> Try again
          </button>
        )}
        {error?.retryable && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>Retrying automatically…</p>}
      </div>
    </div>
  );
}
