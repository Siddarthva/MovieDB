import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, SlidersHorizontal } from 'lucide-react';

import { useTitles } from '../hooks/useTitles';
import { filterEngine } from '../engine/filterEngine';
import { assertType, TYPE_SHOW } from '../api';
import TitleCard from '../components/ui/TitleCard';

export default function ShowsView({ onNavigate }) {
  const { data: shows, loading, error } = useTitles('show');
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const genres = useMemo(() => {
    const ids = new Set();
    shows.forEach((show) => show.classification?.genres?.forEach((genre) => ids.add(genre)));
    return ['all', ...Array.from(ids).sort()];
  }, [shows]);

  const filteredShows = useMemo(() => {
    return filterEngine.byGenre(shows, filter);
  }, [shows, filter]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="gpu-accelerated" style={{ width: 30, height: 30, color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 80px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <p className="label-mini" style={{ margin: '0 0 6px' }}>Streaming Experience</p>
          <h1 style={{ fontSize: '36px' }}>TV Shows</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
             {filteredShows.length} OF {shows.length} SERIES
          </span>
          <button onClick={() => setPanelOpen(!panelOpen)} className="glass" style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
            borderColor: panelOpen ? 'var(--border-active)' : 'var(--border-muted)',
            color: panelOpen ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '13px', fontWeight: 700, transition: 'all 0.25s',
          }}>
            <SlidersHorizontal style={{ width: 14, height: 14 }} /> Genre
          </button>
        </div>
      </div>

      {/* Grid */}
      {error && (
        <p style={{ color: '#fbbf24', margin: '-16px 0 24px', fontSize: '13px' }}>
          Showing bundled catalog while the live API reconnects.
        </p>
      )}

      {panelOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '-16px 0 28px' }}>
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setFilter(genre)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: filter === genre ? '1px solid rgba(129,140,248,0.55)' : '1px solid rgba(255,255,255,0.08)',
                background: filter === genre ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                color: filter === genre ? '#c7d2fe' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'capitalize',
              }}
            >
              {genre.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))',
        gap: '28px', justifyItems: 'center',
      }}>
        {filteredShows.map(t => {
          if (!assertType(t, TYPE_SHOW)) return null;
          return <TitleCard key={t.id} title={t} onNavigate={onNavigate} />;
        })}
      </div>
    </div>
  );
}
