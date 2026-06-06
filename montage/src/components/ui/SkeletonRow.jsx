import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import SkeletonCard from './SkeletonCard';

const CARD_GAP = 18;
const CARD_HEIGHT = 400;
const BASE_WIDTH = 208;

export default function SkeletonRow({ label, reverse = false, count = 12 }) {
  const skeletonItems = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const tripled = useMemo(() => [...skeletonItems, ...skeletonItems, ...skeletonItems], [skeletonItems]);
  const singleSetWidth = skeletonItems.length * (BASE_WIDTH + CARD_GAP);
  const initialX = -singleSetWidth;
  const animateX = reverse ? [initialX, 0] : [initialX, -(singleSetWidth * 2)];

  return (
    <section style={{ position: 'relative' }}>
      <h2
        style={{
          color: 'white',
          margin: '0 0 14px',
          fontSize: 'clamp(1.05rem, 3.3vw, 1.25rem)',
          padding: '0 clamp(16px, 4vw, 36px)',
        }}
      >
        {label}
      </h2>

      <div style={{ position: 'relative', overflow: 'hidden', padding: '10px 0 28px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 6,
            background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, transparent 7%, transparent 93%, rgba(0,0,0,0.9) 100%)',
          }}
        />

        <motion.div
          initial={{ x: initialX }}
          animate={{ x: animateX }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 60 }}
          style={{
            display: 'flex',
            gap: `${CARD_GAP}px`,
            width: 'max-content',
            padding: '0 clamp(16px, 4vw, 36px)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          {tripled.map((item, index) => (
            <SkeletonCard key={`skeleton-${item}-${index}`} width={BASE_WIDTH} height={CARD_HEIGHT} />
          ))}
        </motion.div>
      </div>

      <style>{`@keyframes row-skeleton-shimmer {0%{background-position:200% 0;} 100%{background-position:-200% 0;}}`}</style>
    </section>
  );
}
