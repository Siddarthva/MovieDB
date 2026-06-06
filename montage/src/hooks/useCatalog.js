import { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY = { titles: [], people: [], genres: [], categories: [] };

export function useCatalog() {
  const [catalog, setCatalog] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(silent = false) {
      if (!silent) setLoading(true);
      try {
        const data = await api.getCatalog();
        if (!cancelled) {
          setCatalog({
            titles: data.titles ?? [],
            people: data.people ?? [],
            genres: data.genres ?? [],
            categories: data.categories ?? [],
          });
          setError(null);
          setIsOffline(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError);
          setIsOffline(true);
        }
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    }

    load();

    const retryTimer = setInterval(() => {
      load(true);
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(retryTimer);
    };
  }, []);

  return { ...catalog, loading, error, isOffline };
}