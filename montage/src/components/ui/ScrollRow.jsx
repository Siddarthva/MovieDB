import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import TitleCard from './TitleCard';
import SkeletonRow from './SkeletonRow';

const CARD_GAP = 18;
const CARD_HEIGHT = 400;
const BASE_WIDTH = 208;
export { default as SkeletonRow } from './SkeletonRow';

export default function ScrollRow({ label, items, onNavigate, reverse = false }) {
  const controls = useAnimationControls();
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const measureRef = useRef(null);
  const latestXRef = useRef(0);
  const [singleSetWidth, setSingleSetWidth] = useState(0);

  const cleanItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);
  const tripleItems = useMemo(() => [...cleanItems, ...cleanItems, ...cleanItems], [cleanItems]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!measureRef.current) return;

    const measure = () => {
      const width = measureRef.current?.offsetWidth ?? 0;
      if (width > 0) setSingleSetWidth(width);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(measureRef.current);

    return () => resizeObserver.disconnect();
  }, [cleanItems]);

  const measuredWidth = singleSetWidth || cleanItems.length * (BASE_WIDTH + CARD_GAP);
  const initialX = -measuredWidth;

  const normalizeBackwardX = (x) => {
    if (!measuredWidth) return initialX;
    const offset = ((x - initialX) % measuredWidth + measuredWidth) % measuredWidth;
    return initialX - offset;
  };

  const normalizeForwardX = (x) => {
    if (!measuredWidth) return initialX;
    const offset = ((x - initialX) % measuredWidth + measuredWidth) % measuredWidth;
    return initialX + offset;
  };

  useEffect(() => {
    latestXRef.current = initialX;
    controls.set({ x: initialX });
  }, [controls, initialX]);

  useEffect(() => {
    if (isMobile) {
      controls.stop();
      controls.set({ x: 0 });
      return;
    }

    if (!measuredWidth || !cleanItems.length) return;

    if (isPaused) {
      controls.stop();
      return;
    }

    const startX = reverse
      ? normalizeForwardX(latestXRef.current)
      : normalizeBackwardX(latestXRef.current);
    const endX = reverse ? startX + measuredWidth : startX - measuredWidth;

    controls.start({
      x: [startX, endX],
      transition: {
        repeat: Infinity,
        ease: 'linear',
        duration: 60,
      },
    });
  }, [cleanItems.length, controls, isMobile, isPaused, measuredWidth, reverse]);

  if (!cleanItems.length) {
    return (
      <section style={{ padding: '0 clamp(16px, 4vw, 36px)' }}>
        <h2 style={{ color: 'white', margin: '0 0 14px', fontSize: 'clamp(1.05rem, 3.3vw, 1.25rem)' }}>{label}</h2>
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', color: '#6b7280' }}>
          No titles matched this DNA cluster yet.
        </div>
      </section>
    );
  }

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

      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          display: 'flex',
          gap: `${CARD_GAP}px`,
          width: 'max-content',
          left: '-100000px',
          top: '-100000px',
        }}
      >
        {cleanItems.map((title) => (
          <div
            key={`measure-${title.id}`}
            style={{ width: `${BASE_WIDTH}px`, height: `${CARD_HEIGHT}px`, flexShrink: 0 }}
          />
        ))}
      </div>

      {isMobile ? (
        <div style={{ position: 'relative', overflowX: 'auto', overflowY: 'visible', padding: '6px 0 22px' }}>
          <div
            style={{
              display: 'flex',
              gap: `${CARD_GAP}px`,
              width: 'max-content',
              padding: '0 clamp(16px, 4vw, 36px)',
              scrollSnapType: 'x mandatory',
            }}
          >
            {cleanItems.map((title, index) => (
              <div key={`${label}-${title.id}-${index}`} style={{ scrollSnapAlign: 'start' }}>
                <TitleCard
                  title={title}
                  onNavigate={onNavigate}
                  inInfiniteRow
                  rowHeight={CARD_HEIGHT}
                  baseWidth={BASE_WIDTH}
                  onHoverChange={() => {}}
                  isTouchDevice
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
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
            onUpdate={(latest) => {
              if (typeof latest.x === 'number') latestXRef.current = latest.x;
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            initial={{ x: initialX }}
            animate={controls}
            whileHover={{ scale: 1, animationPlayState: 'paused' }}
            style={{
              display: 'flex',
              gap: `${CARD_GAP}px`,
              width: 'max-content',
              padding: '0 clamp(16px, 4vw, 36px)',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            {tripleItems.map((title, index) => (
              <TitleCard
                key={`${label}-${title.id}-${index}`}
                title={title}
                onNavigate={onNavigate}
                inInfiniteRow
                rowHeight={CARD_HEIGHT}
                baseWidth={BASE_WIDTH}
                onHoverChange={setIsPaused}
              />
            ))}
          </motion.div>
        </div>
      )}

    </section>
  );
}
