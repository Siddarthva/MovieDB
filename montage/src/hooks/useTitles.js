import { useMemo } from 'react';
import { useCatalog } from './useCatalog';

/**
 * Unified data hook for cinematic titles.
 * Handles loading, error states, and automatic type filtering.
 */
export function useTitles(type = null) {
  const { titles, loading, error } = useCatalog();

  const data = useMemo(() => {
    if (type === 'movie') return titles.filter((title) => title.type === 'movie');
    if (type === 'show') return titles.filter((title) => title.type === 'show');
    return titles;
  }, [titles, type]);

  return { data, loading, error };
}
