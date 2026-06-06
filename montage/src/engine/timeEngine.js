/**
 * Time-aware status engine.
 * Returns 'upcoming' if releaseDate > today (midnight normalized), else 'released'.
 * Never hardcode status — always computed dynamically.
 */
export function getStatus(title) {
  if (!title) return 'released';

  // Support both title object and legacy date string
  const dateString = typeof title === 'object'
    ? (title.releaseDate || (title.year ? `${title.year}-01-01` : null))
    : title;

  if (!dateString) return 'released';

  // Parse as UTC midnight
  const release = new Date(dateString + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return release > today ? 'upcoming' : 'released';
}

/**
 * Days until release. Returns null for released titles.
 */
export function getDaysUntil(title) {
  if (!title) return null;
  const dateString = title.releaseDate || (title.year ? `${title.year}-01-01` : null);
  if (!dateString) return null;
  
  const release = new Date(dateString + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = release - today;
  if (diffMs <= 0) return null;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a releaseDate string into a human-readable label.
 * e.g. "2026-07-18" → "Jul 18, 2026"
 */
export function formatReleaseDate(title) {
  const dateString = typeof title === 'object' 
    ? (title?.releaseDate || (title?.year ? `${title.year}-01-01` : null))
    : title; // support legacy string passing if needed

  if (!dateString) return 'TBA';
  
  const d = new Date(dateString + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Group an array of titles by their release month.
 * This is used for the 'calendar' view.
 */
export function groupByMonth(titles) {
  const map = {};
  titles.forEach(t => {
    if (!t.releaseDate) {
      console.warn(`[groupByMonth] Skipping title ${t.id} due to missing releaseDate`);
      return;
    }
    
    const d = new Date(t.releaseDate + 'T00:00:00Z');
    // For sorting and labels, use UTC components
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    if (!map[key]) {
      map[key] = {
        key,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        month: month,
        year: year,
        titles: [],
      };
    }
    map[key].titles.push(t);
  });
  
  return Object.values(map).sort((a, b) => {
    // Correct sorting by date
    return new Date(a.year, a.month) - new Date(b.year, b.month);
  });
}
