import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Tv, Loader2, SlidersHorizontal } from 'lucide-react';

import { useTitles } from '../hooks/useTitles';
import { filterEngine } from '../engine/filterEngine';
import { assertType, TYPE_SHOW } from '../api';
import TitleCard from '../components/ui/TitleCard';

export default function ShowsView({ onNavigate }) {
  const { data: shows, loading, error } = useTitles('show');
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState('all');

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
