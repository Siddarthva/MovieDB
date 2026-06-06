/**
 * Advanced Filtering Engine for CinePulse.
 * Handles multi-dimensional filtering, fuzzy search, and complex sorting logic.
 */

export const filterEngine = {
  /** Filter by genre array */
  byGenre: (titles, genreId) => {
    if (!genreId || genreId === 'all') return titles;
    return titles.filter(t => t.classification?.genres?.includes(genreId));
  },

  /** Filter by year range */
  byYearRange: (titles, min, max) => {
    return titles.filter(t => t.year >= min && t.year <= max);
  },

  /** Generic multi-sorter */
  sort: (titles, criterion) => {
    const list = [...titles];
    switch (criterion) {
      case 'newest':
        return list.sort((a, b) => b.year - a.year);
      case 'oldest':
        return list.sort((a, b) => a.year - b.year);
      case 'rating':
        return list.sort((a, b) => (b.metrics?.ratings?.critic || 0) - (a.metrics?.ratings?.critic || 0));
      case 'cineScore':
        return list.sort((a, b) => (b.metrics?.ratings?.cineScore || 0) - (a.metrics?.ratings?.cineScore || 0));
      default:
        return list;
    }
  },

  /** Search across titles and people IDs */
  search: (titles, query) => {
    if (!query) return [];
    const q = query.toLowerCase();
    return titles.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.people?.directorId?.toLowerCase().includes(q) ||
      t.people?.castIds?.some(id => id.toLowerCase().includes(q))
    );
  }
};
