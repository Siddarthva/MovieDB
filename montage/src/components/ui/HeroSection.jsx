import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight } from 'lucide-react';
import SafeImage from './SafeImage';

const MotionSafeImage = motion.create(SafeImage);

export default function HeroSection({ titles, onNavigate }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (titles.length <= 1) return undefined;
    const t = setInterval(() => setIdx(p => (p + 1) % titles.length), 7000);
    return () => clearInterval(t);
  }, [titles.length]);

  const safeIndex = titles.length > 0 ? Math.min(idx, titles.length - 1) : 0;
  const current = titles[safeIndex];
  if (!current) return null;

  // ── New schema accessors ────────────────────────────────────────────────────
  const backdrop = current.media?.backdrop;
  const synopsis = current.details?.synopsis;

  const typeLabel = current.type === 'show'
    ? (current.showMeta?.format === 'Anime' ? 'Anime Series' : 'Series')
    : 'Film';

  return (
    <div style={{
      position: 'relative', height: '78vh', minHeight: '540px',
      width: '100%', overflow: 'hidden', background: '#000',
      borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Backdrop crossfade */}
      <AnimatePresence initial={false}>
        <MotionSafeImage
          key={`bg-${idx}`}
          src={backdrop} alt=""
          type="backdrop"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, filter: 'blur(1px)', zIndex: 1 }}
        />
      </AnimatePresence>

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.08) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }} />

      {/* Content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '44px 52px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${idx}`}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
            style={{ maxWidth: '580px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#9ca3af', textTransform: 'uppercase' }}>{typeLabel}</span>
              <span style={{ color: '#4b5563', fontSize: '10px' }}>·</span>
              <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>{current.year}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(40px, 6.5vw, 80px)', fontWeight: 900, color: 'white', letterSpacing: '-0.035em', lineHeight: 1.0, margin: '0 0 18px' }}>
              {current.title}
            </h1>

            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.7, margin: '0 0 28px', maxWidth: '440px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {synopsis}
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('title', current.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'white', color: 'black', padding: '12px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
              >
                <Play style={{ width: 15, height: 15, fill: 'black' }} /> Explore
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('title', current.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', color: '#d1d5db', padding: '12px 22px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
              >
                More Info <ChevronRight style={{ width: 14, height: 14 }} />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot nav */}
        <div style={{ display: 'flex', gap: '5px', marginTop: '24px' }}>
          {titles.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ width: i === safeIndex ? '22px' : '7px', height: '7px', borderRadius: '4px', background: i === safeIndex ? '#ffffff' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s ease' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
