import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Film, Tv, Star } from 'lucide-react';

function toImdb(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric.toFixed(1);
  }
  return String(value);
}

function CensorBadge({ rating }) {
  const label = String(rating ?? '').trim().toUpperCase() || 'NR';

  const toneMap = {
    G: { border: '#22c55e', text: '#dcfce7' },
    PG: { border: '#22c55e', text: '#dcfce7' },
    'PG-13': { border: '#facc15', text: '#fef9c3' },
    R: { border: '#ef4444', text: '#fee2e2' },
    'NC-17': { border: '#ef4444', text: '#fee2e2' },
  };
  const tone = toneMap[label] ?? { border: 'rgba(255,255,255,0.35)', text: '#e5e7eb' };

  return (
    <span
      style={{
        border: `1px solid ${tone.border}`,
        color: tone.text,
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        letterSpacing: '0.07em',
        padding: '2px 7px',
        borderRadius: '4px',
        textTransform: 'uppercase',
        lineHeight: '1.4',
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

export default function TitleHero({ title, onPlayTrailer }) {
  const [posterLoaded, setPosterLoaded] = useState(false);

  const poster = title?.poster ?? title?.media?.poster ?? null;
  const trailer = title?.trailer ?? title?.media?.trailer ?? null;
  const synopsis = title?.details?.synopsis ?? title?.synopsis ?? '';

  const imdbRaw =
    title?.ratings?.imdb ??
    title?.imdb ??
    title?.rating ??
    title?.metrics?.ratings?.imdb ??
    title?.metrics?.imdb ??
    null;
  const imdbDisplay = toImdb(imdbRaw);

  const isShow = title?.type === 'show';
  const isAnime = isShow && title?.showMeta?.format === 'Anime';
  const typeLabel = isAnime ? 'Anime Series' : isShow ? 'Series' : 'Movie';
  const accentColor = isAnime ? '#c084fc' : isShow ? '#38bdf8' : '#818cf8';

  const censorRating =
    title?.censor_rating ?? title?.classification?.rating ?? null;
  const runtime = title?.details?.runtime ?? title?.runtime ?? null;
  const director = title?.director ?? null;
  const country = title?.country ?? null;
  const language = title?.language ?? null;

  const metaCols = [
    director ? { label: 'Directed By', value: director } : null,
    country ? { label: 'Country', value: country } : null,
    language ? { label: 'Language', value: language } : null,
    runtime ? { label: 'Runtime', value: runtime } : null,
  ]
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-end">
      {/* ── Poster ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ flexShrink: 0 }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title?.title}
            onLoad={() => setPosterLoaded(true)}
            loading="lazy"
            className="w-48 lg:w-64 aspect-[2/3] object-cover rounded-xl shadow-2xl shrink-0"
            style={{ opacity: posterLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
          />
        ) : (
          <div
            className="w-48 lg:w-64 aspect-[2/3] rounded-xl shadow-2xl shrink-0"
            style={{
              display: 'grid',
              placeItems: 'center',
              background: `linear-gradient(135deg, ${accentColor}22, #111)`,
            }}
          >
            {isShow
              ? <Tv style={{ width: 36, height: 36, color: accentColor, opacity: 0.4 }} />
              : <Film style={{ width: 36, height: 36, color: accentColor, opacity: 0.4 }} />}
          </div>
        )}
      </motion.div>

      {/* ── Text block ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col gap-4 max-w-3xl pb-4"
        style={{ minWidth: '260px' }}
      >
        {/* Title */}
        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-none">
          {title?.title ?? 'Untitled'}
        </h1>

        {/* Metadata row: Censor Badge • Type • Year • Runtime */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 font-medium">
          <CensorBadge rating={censorRating} />
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
          <span>{typeLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
          <span>{title?.year ?? 'Unknown Year'}</span>
          {runtime && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
              <span>{runtime}</span>
            </>
          )}
        </div>

        {/* Synopsis */}
        {synopsis && (
          <p className="text-gray-300 text-sm lg:text-base leading-relaxed max-w-2xl line-clamp-4">
            {synopsis}
          </p>
        )}

        {/* Star Rating */}
        {imdbDisplay && (
          <div className="flex items-center gap-2">
            <Star style={{ width: 18, height: 18, color: '#facc15', fill: '#facc15', flexShrink: 0 }} />
            <span className="text-lg font-bold text-white">{imdbDisplay}</span>
            <span className="text-sm text-gray-500 font-medium">/10</span>
          </div>
        )}

        {/* Meta columns: Director / Country / Language */}
        {metaCols.length > 0 && (
          <div className="flex flex-wrap gap-6 text-sm text-gray-300 font-medium">
            {metaCols.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-[0.08em] text-gray-500">{label}</span>
                <span className="text-white font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Watch Trailer button */}
        {trailer && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={onPlayTrailer}
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold w-fit mt-1"
            style={{ boxShadow: '0 6px 20px rgba(255,255,255,0.12)' }}
          >
            <Play style={{ width: 14, height: 14, fill: 'black' }} />
            Watch Trailer
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
