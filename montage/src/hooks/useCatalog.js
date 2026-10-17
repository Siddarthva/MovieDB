import { useCallback, useEffect, useState } from 'react';
import { api, resetCatalog } from '../api';

const EMPTY = { titles: [], people: [], genres: [], categories: [] };
const RETRY_MS = 15000;

/**
 * Loads the catalog once (shared, cached). On failure it exposes `error` and retries every
 * RETRY_MS while the page is open. It never substitutes bundled data.
 */
export function useCatalog() {
  const [catalog, setCatalog] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.getCatalog().then(
      (data) => {
        if (cancelled) return;
        setCatalog({ titles: data.titles, people: data.people, genres: data.genres, categories: data.categories });
        setError(null);
        setLoading(false);
      },
      (loadError) => {
        if (cancelled) return;
        setError(loadError);
        setLoading(false);
      },
    );
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    if (!error?.retryable) return undefined;
    const timer = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
    return () => clearTimeout(timer);
  }, [error]);

  const retry = useCallback(() => {
    resetCatalog();
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { ...catalog, loading, error, retry };
}
