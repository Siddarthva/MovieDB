import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

import { useCatalog } from '../hooks/useCatalog';
import ScrollRow from '../components/ui/ScrollRow';

export default function MoviesView({ onNavigate }) {
  const { categories, loading } = useCatalog();

  const movieRows = useMemo(
    () => categories.map((category) => ({
      ...category,
      titles: (category.titles ?? []).filter((title) => title.type === 'movie'),
    })),
    [categories],
  );

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="gpu-accelerated" style={{ width: 30, height: 30, color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '1560px', margin: '0 auto', padding: '16px 0 72px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px', padding: '0 clamp(16px, 4vw, 36px)' }}>
        <div>
          <p className="label-mini" style={{ margin: '0 0 6px' }}>DNA Categories</p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.25rem)', lineHeight: 1.1 }}>Movies · Infinite Rows</h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
        {movieRows.map((category, index) => (
          <ScrollRow
            key={category.id}
            label={category.label}
            items={category.titles}
            onNavigate={onNavigate}
            reverse={index % 2 === 1}
          />
        ))}
      </div>
    </div>
  );
}
