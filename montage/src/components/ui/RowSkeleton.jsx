import React from 'react';

/** Placeholder with the same footprint as a ScrollRow, so loading does not shift the layout. */
export default function RowSkeleton({ label, count = 8 }) {
  return (
    <section aria-hidden="true">
      <h2 style={{ margin: '0 0 var(--space-3)', padding: '0 var(--gutter)', fontSize: 'var(--text-lg)', color: 'var(--text-muted)' }}>{label}</h2>
      <div className="row-scroller" style={{ overflow: 'hidden' }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton" style={{ width: 188, aspectRatio: '2 / 3', flexShrink: 0 }} />
        ))}
      </div>
    </section>
  );
}
