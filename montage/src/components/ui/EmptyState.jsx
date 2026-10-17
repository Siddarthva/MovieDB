import React from 'react';

export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--text-muted)' }}>
      {Icon && <Icon aria-hidden="true" style={{ width: 40, height: 40, margin: '0 auto var(--space-3)', opacity: 0.4 }} />}
      <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-secondary)' }}>{title}</p>
      {children && <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-base)' }}>{children}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
