/**
 * Anticipation Engine — ranks upcoming titles by popularity-based score.
 * hype field removed from schema; falls back to metrics.popularity.
 */

/**
 * Score for an upcoming title — uses metrics.popularity (0-100).
 * Kept as a function so callers are unchanged.
 */
export function calcHypeScore(title) {
  return title?.metrics?.popularity ?? 0;
}

/**
 * Returns upcoming titles sorted by score descending.
 */
export function getMostAnticipated(titles) {
  return [...titles]
    .map(t => ({ ...t, hypeScore: calcHypeScore(t) }))
    .sort((a, b) => b.hypeScore - a.hypeScore);
}

/**
 * Hype tier — retained for any future badge use.
 */
export function getHypeTier(score) {
  if (score >= 92) return { label: 'MEGA HYPE', color: '#f59e0b' };
  if (score >= 85) return { label: 'HIGH HYPE', color: '#6366f1' };
  if (score >= 75) return { label: 'BUILDING',  color: '#10b981' };
  return           { label: 'WATCH',             color: '#6b7280' };
}
