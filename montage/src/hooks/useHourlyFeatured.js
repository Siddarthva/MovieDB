import { useState, useEffect } from 'react';
import { api } from '../api';
import { getStatus } from '../engine/timeEngine';
import { getRandomSubset } from '../utils/shuffle';

const STORAGE_KEY_TITLES    = 'cinepulse_featuredTitles';
const STORAGE_KEY_TIMESTAMP = 'cinepulse_featuredTimestamp';
const ONE_HOUR              = 1000 * 60 * 60;
const FEATURED_COUNT        = 5;
const TOP_POOL_SIZE         = 20; // limit randomness to top-rated titles

/** Safely read and parse localStorage. Returns null on any error. */
function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TITLES);
    const ts  = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
    if (!raw || !ts) return null;
    const titles    = JSON.parse(raw);
    const timestamp = parseInt(ts, 10);
    if (!Array.isArray(titles) || titles.length === 0 || isNaN(timestamp)) return null;
    return { titles, timestamp };
  } catch {
    return null;
  }
}

/** Persist the selection to localStorage. Silently ignores write errors. */
function writeCache(titles) {
  try {
    localStorage.setItem(STORAGE_KEY_TITLES, JSON.stringify(titles));
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, String(Date.now()));
  } catch {
    // localStorage unavailable (private mode, quota exceeded, etc.) — no-op
  }
}

/** Invalidate the cache so the next load picks fresh titles. */
export function invalidateFeaturedCache() {
  try {
    localStorage.removeItem(STORAGE_KEY_TITLES);
    localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  } catch { /* no-op */ }
}

/**
 * useHourlyFeatured
 *
 * Returns { featured: Title[], loading: boolean }
 *
 * Selection strategy:
 *   1. Call api.getReleasedTitles() once per component mount.
 *   2. Filter to titles that have both a poster and a backdrop.
 *   3. Rank by cineScore, take the top TOP_POOL_SIZE.
 *   4. Randomly select FEATURED_COUNT from that pool.
 *   5. Persist selection + timestamp in localStorage.
 *   6. On subsequent loads within the same hour, return cached selection.
 */
export function useHourlyFeatured() {
  const [featured, setFeatured] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // ── 1. Check cache first ─────────────────────────────────────────────
        const cache = readCache();
        if (cache && Date.now() - cache.timestamp < ONE_HOUR) {
          if (!cancelled) {
            setFeatured(cache.titles);
            setLoading(false);
          }
          return;
        }

        // ── 2. Fetch all titles ─────────────────────────────────────────────
        const all = await api.getAllTitles();

        // ── 3. Guard: only released titles with images ────────────────────────
        const valid = all.filter(t => 
          getStatus(t) === 'released' &&
          t.media?.poster && 
          t.media?.backdrop && 
          t.details?.synopsis
        );

        // ── 4. Prioritize: top POOL by cineScore ─────────────────────────────
        const pool = [...valid]
          .sort((a, b) => (b.metrics?.ratings?.cineScore ?? 0) - (a.metrics?.ratings?.cineScore ?? 0))
          .slice(0, TOP_POOL_SIZE);

        // ── 5. Random selection ──────────────────────────────────────────────
        const selection = getRandomSubset(pool, FEATURED_COUNT);

        // ── 6. Persist ───────────────────────────────────────────────────────
        if (selection.length > 0) writeCache(selection);

        if (!cancelled) {
          setFeatured(selection);
          setLoading(false);
        }
      } catch {
        // API failure — fall back to empty (HeroSection handles gracefully)
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []); // run once on mount

  return { featured, loading };
}
