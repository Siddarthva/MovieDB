import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { getStatus } from '../engine/timeEngine';
import TitleCard from '../components/ui/TitleCard';
import { useCatalog } from '../hooks/useCatalog';

const DEFAULT = {
  type: 'all',
  genre: 'all',
  status: 'all',
  sortBy: 'popularity',
};

function Select({ label, value, options, onChange }) {
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', padding: '7px 28px 7px 10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '7px', color: 'white',
          fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', outline: 'none',
          appearance: 'none', WebkitAppearance: 'none',
        }}>
          {options.map(o => (
            <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>
          ))}
        </select>
        <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#6b7280', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, unit = '', onChange }) {
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}: <span style={{ color: '#818cf8' }}>{value}{unit}+</span>
      </p>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }} />
    </div>
  );
}

export default function LibraryView({ onNavigate }) {
  const { titles, genres } = useCatalog();
  const [f, setF] = useState(DEFAULT);
  const [open, setOpen] = useState(false);
  const set = useCallback((k, v) => setF(p => ({ ...p, [k]: v })), []);
  const reset = useCallback(() => setF(DEFAULT), []);
  const isFiltered = JSON.stringify(f) !== JSON.stringify(DEFAULT);

  const results = useMemo(() => {
    let r = [...titles];
    if (f.type !== 'all') r = r.filter(t => t.type === f.type);
    if (f.genre !== 'all') r = r.filter(t => t.classification?.genres.includes(f.genre));
    if (f.status !== 'all') r = r.filter(t => getStatus(t) === f.status);
    r.sort((a, b) => {
      if (f.sortBy === 'year') return b.year - a.year;
      if (f.sortBy === 'title') return a.title.localeCompare(b.title);
      return (b.metrics?.popularity ?? 0) - (a.metrics?.popularity ?? 0);
    });
    return r;
  }, [f, titles]);

  const genreOptions = [
    { value: 'all', label: 'All Genres' },
    ...genres.map((genre) => ({ value: genre.id, label: genre.name ?? genre.id })),
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
            Full Catalog
          </p>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.03em' }}>Library</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>
            {results.length} / {titles.length}
          </span>
          {isFiltered && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={reset}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 12px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <X style={{ width: 11, height: 11 }} /> Reset
            </motion.button>
          )}
          <button
            onClick={() => setOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              background: open ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)',
              border: open ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: open ? '#818cf8' : '#9ca3af',
              fontSize: '13px', fontWeight: 700, transition: 'all 0.25s',
            }}
          >
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
            Filter {isFiltered && '·'}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 28 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '20px 24px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '20px',
            }}>
              <Select label="Type" value={f.type} onChange={v => set('type', v)}
                options={[{ value: 'all', label: 'All' }, { value: 'movie', label: 'Movie' }, { value: 'show', label: 'Show' }]} />
              <Select label="Status" value={f.status} onChange={v => set('status', v)}
                options={[{ value: 'all', label: 'All' }, { value: 'released', label: 'Released' }, { value: 'upcoming', label: 'Upcoming' }]} />
              <Select label="Genre" value={f.genre} onChange={v => set('genre', v)} options={genreOptions} />
              <Select label="Sort by" value={f.sortBy} onChange={v => set('sortBy', v)}
                options={[
                  { value: 'popularity', label: 'Popular' },
                  { value: 'year', label: 'Newest' },
                  { value: 'title', label: 'A – Z' },
                ]} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontSize: '15px', color: '#6b7280', fontWeight: 600 }}>No titles match your filters.</p>
          <button onClick={reset} style={{ marginTop: '12px', padding: '9px 18px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            Reset filters
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))',
          gap: '28px', justifyItems: 'center',
        }}>
          {results.map(t => (
            <TitleCard key={t.id} title={t} onNavigate={onNavigate} inCarousel={false} />
          ))}
        </div>
      )}
    </div>
  );
}
