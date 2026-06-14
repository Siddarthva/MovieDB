import React, { useEffect, useRef, useState, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tv, Film, X } from 'lucide-react';
import SafeImage from './SafeImage';
import CensorNode from './CensorNode';

const TitleCard = memo(function TitleCard({
  title,
  onNavigate,
  variant = 'expanded',
  showMatchReason = false,
  inCarousel = false,
  isFocused = true,
  inInfiniteRow = false,
  rowHeight = 312,
  baseWidth = 208,
  onHoverChange = () => {},
  isTouchDevice = false,
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchExpanded, setIsTouchExpanded] = useState(false);
  const cardRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovering(true);
    onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    onHoverChange(false);
  };

  useEffect(() => {
    if (!isTouchDevice || !isTouchExpanded) return undefined;

    const onPointerDown = (event) => {
      if (!cardRef.current) return;
      if (!cardRef.current.contains(event.target)) {
        setIsTouchExpanded(false);
        onHoverChange(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isTouchDevice, isTouchExpanded, onHoverChange]);

  // ── New schema accessors ────────────────────────────────────────────────────
  const poster = title?.posterUrl ?? title?.media?.poster ?? null;
  const backdrop = title?.backdropUrl ?? title?.media?.backdrop ?? null;
  const censorRating = title?.censor_rating ?? title?.classification?.rating ?? title?.rating ?? 'NR';

  const isShow       = title.type === 'show';
  const isAnime      = isShow && title.showMeta?.format === 'Anime';
  const TypeIcon     = isShow ? Tv : Film;
  const accentColor  = isAnime ? '#c084fc' : isShow ? '#38bdf8' : '#818cf8';
  const isSimpleVariant = variant === 'simple';
  const defaultWidth = inInfiniteRow ? baseWidth : 188;
  const isExpanded = isSimpleVariant ? isHovering : (isTouchDevice ? isTouchExpanded : isHovering);

  const handleCardClick = () => {
    if (!isTouchDevice) {
      onNavigate('title', title.id);
      return;
    }

    if (!isTouchExpanded) {
      setIsTouchExpanded(true);
      onHoverChange(true);
      return;
    }

    onNavigate('title', title.id);
  };

  const closeTouchExpansion = (event) => {
    event.stopPropagation();
    setIsTouchExpanded(false);
    onHoverChange(false);
  };

  const scale = inCarousel ? (isFocused ? 1.04 : 0.88) : 1;
  const opacity = isExpanded ? 1 : inCarousel ? (isFocused ? 1 : 0.42) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
      <motion.div
        ref={cardRef}
        data-testid="title-card"
        animate={{ scale, opacity }}
        transition={{
          scale: { duration: 0.18, ease: 'easeOut' },
          opacity: { duration: 0.18, ease: 'easeOut' },
        }}
        onMouseEnter={isTouchDevice ? undefined : handleMouseEnter}
        onMouseLeave={isTouchDevice ? undefined : handleMouseLeave}
        onClick={handleCardClick}
        whileTap={{ scale: 0.96 }}
        style={{
          position: 'relative', cursor: 'pointer',
          width: `${defaultWidth}px`,
          height: inInfiniteRow ? `${rowHeight}px` : undefined,
          flexShrink: 0,
          aspectRatio: inInfiniteRow ? undefined : '2 / 3',
          borderRadius: '14px',
          border: isExpanded ? `1px solid ${accentColor}55` : '1px solid rgba(255,255,255,0.07)',
          background: '#0a0a0a', overflow: 'hidden',
          boxShadow: isExpanded
            ? `inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -36px 56px rgba(0,0,0,0.45), 0 0 24px ${accentColor}18, 0 16px 48px rgba(0,0,0,0.8)`
            : '0 8px 32px rgba(0,0,0,0.6)',
          willChange: 'transform',
          zIndex: isExpanded ? 50 : isFocused ? 20 : 10,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Poster */}
        <SafeImage src={poster} alt={title.title} type="poster"
          style={{ position: 'absolute', inset: 0, transition: 'opacity 0.25s', opacity: isExpanded ? 0.2 : 1 }}
        />

        {/* Hover backdrop */}
        <SafeImage
          src={backdrop || poster}
          alt=""
          type={backdrop ? 'backdrop' : 'poster'}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.25s',
          }}
        />

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          borderRadius: '6px', border: '1px solid rgba(255,255,255,0.09)',
          padding: '4px 6px', display: 'flex', alignItems: 'center',
          opacity: isExpanded ? 0 : 1, transition: 'opacity 0.25s',
        }}>
          <TypeIcon style={{ width: 13, height: 13, color: accentColor }} />
        </div>

        {isTouchDevice && isTouchExpanded && (
          <button
            type="button"
            aria-label="Collapse card"
            onClick={closeTouchExpansion}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 30,
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.65)',
              color: '#f3f4f6',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}

        {/* Hover overlay */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                background: isSimpleVariant
                  ? 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.1) 100%)'
                  : 'linear-gradient(to top, rgba(0,0,0,0.92) 8%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.22) 100%)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '18px',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ position: 'absolute', top: '12px', right: '12px' }}
              >
                <CensorNode rating={censorRating} />
              </motion.div>

              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <motion.p
                  data-testid="card-title"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ fontWeight: 800, color: 'white', fontSize: isSimpleVariant ? '18px' : '14px', margin: 0, lineHeight: 1.2 }}
                >
                  {title.title}
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showMatchReason && title.matchReason && (
        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, paddingLeft: '4px', maxWidth: '188px', lineHeight: 1.5, margin: 0 }}>
          {title.matchReason}
        </p>
      )}
    </div>
  );
});

export default TitleCard;
