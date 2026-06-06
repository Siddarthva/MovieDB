import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getStatus } from '../engine/timeEngine';
import CategoryRow from '../components/ui/CategoryRow';
import { useTitles } from '../hooks/useTitles';

export default function ReleasedView({ onNavigate }) {
  const { data: titles } = useTitles();
  const released = useMemo(() =>
    titles.filter(t => getStatus(t) === 'released'), [titles]);

  const topRated = useMemo(() =>
    [...released].sort((a, b) => (b.metrics?.ratings?.cineScore ?? 0) - (a.metrics?.ratings?.cineScore ?? 0)), [released]);

  const movies = useMemo(() =>
    released.filter(t => t.type === 'movie'), [released]);

  const shows = useMemo(() =>
    released.filter(t => t.type === 'show')
      .sort((a, b) => (b.showMeta?.bingeScore || 0) - (a.showMeta?.bingeScore || 0)), [released]);

  return (
    <div style={{ maxWidth: '1560px', margin: '0 auto', padding: '24px 0 80px' }}>
      <div style={{ padding: '0 32px', marginBottom: '40px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
          Now Available
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.03em' }}>Released</h1>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af', padding: '3px 10px', borderRadius: '20px',
          }}>
            {released.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '52px' }}>
        {topRated.length > 0 && (
          <section>
            <div style={{ padding: '0 32px', marginBottom: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Certified</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '2px 0 0', letterSpacing: '-0.02em' }}>Top Rated</h2>
            </div>
            <CategoryRow titles={topRated} onNavigate={onNavigate} speed={0.38} direction={1} />
          </section>
        )}
        {movies.length > 0 && (
          <section>
            <div style={{ padding: '0 32px', marginBottom: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Films</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '2px 0 0', letterSpacing: '-0.02em' }}>Movies</h2>
            </div>
            <CategoryRow titles={movies} onNavigate={onNavigate} speed={0.35} direction={-1} />
          </section>
        )}
        {shows.length > 0 && (
          <section>
            <div style={{ padding: '0 32px', marginBottom: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Episodic</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '2px 0 0', letterSpacing: '-0.02em' }}>Shows</h2>
            </div>
            <CategoryRow titles={shows} onNavigate={onNavigate} speed={0.3} direction={1} />
          </section>
        )}
      </div>
    </div>
  );
}
