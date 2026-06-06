import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInfiniteScrollAndFocus } from '../../hooks/useInfiniteScrollAndFocus';
import TitleCard from './TitleCard';

export default function CategoryRow({ titles, label, onNavigate, speed = 0.4, direction = 1 }) {
  const [isPaused, setIsPaused] = useState(false);
  const { ref, focusIndex } = useInfiniteScrollAndFocus(speed, isPaused, direction);

  if (!titles || titles.length === 0) return null;
  const extended = [...titles, ...titles, ...titles];

  return (
    <section style={{ position: 'relative' }}>
      {label && (
        <p style={{
          fontSize: '13px', fontWeight: 700,
          color: '#6b7280', textTransform: 'uppercase',
          letterSpacing: '0.08em', margin: '0 0 16px',
          padding: '0 32px',
        }}>
          {label}
        </p>
      )}

      <div style={{ position: 'relative' }}>
        {/* Edge fade */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '80px', height: '100%',
          background: 'linear-gradient(to right, #000, transparent)',
          zIndex: 10, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, width: '80px', height: '100%',
          background: 'linear-gradient(to left, #000, transparent)',
          zIndex: 10, pointerEvents: 'none',
        }} />

        <div
          ref={ref}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            display: 'flex', gap: '18px', alignItems: 'center',
            overflowX: 'hidden',
            paddingTop: '16px', paddingBottom: '32px',
            paddingLeft: '32px', paddingRight: '32px',
          }}
        >
          {extended.map((t, i) => (
            <TitleCard
              key={`${t.id}-${i}`}
              title={t}
              onNavigate={onNavigate}
              inCarousel
              isFocused={i === focusIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
