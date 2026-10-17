import { genreIdsOf, toCard } from './normalize.js';

const ROW_SIZE = 12;
const MIN_GENRE_TITLES = 4;
const MAX_GENRE_ROWS = 4;

/** Release timestamp from `release_date`, else the first day of `year`; null when neither exists. */
function releaseMs(row) {
  const date = row.release_date && /^\d{4}-\d{2}-\d{2}/.test(row.release_date) ? Date.parse(row.release_date.slice(0, 10)) : NaN;
  if (!Number.isNaN(date)) return date;
  return Number.isInteger(row.year) ? Date.UTC(row.year, 0, 1) : null;
}

const newestFirst = (a, b) => (releaseMs(b) ?? 0) - (releaseMs(a) ?? 0) || String(a.title).localeCompare(String(b.title)) || String(a.id).localeCompare(String(b.id));

/**
 * Build the home page rows from catalog rows. Pure function (clock injected).
 *
 * The schema has no popularity, rating or created-at columns, so there are deliberately no
 * "Trending" or "Critically Acclaimed" rows. Every row states its `method` so the UI and API
 * consumers can see exactly how titles were chosen.
 */
export function buildHomeRows(rows, genres = [], now = new Date()) {
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dated = rows.filter((r) => releaseMs(r) !== null);
  const released = dated.filter((r) => releaseMs(r) <= todayMs).sort(newestFirst);
  const upcoming = dated.filter((r) => releaseMs(r) > todayMs).sort((a, b) => newestFirst(b, a));

  const out = [
    { id: 'latest_releases', label: 'Latest Releases', method: 'Already released, newest release date first', items: released },
    { id: 'new_movies', label: 'New Movies', method: 'Movies, newest release date first', items: released.filter((r) => r.type === 'movie') },
    { id: 'new_shows', label: 'New TV Shows', method: 'TV shows, newest release date first', items: released.filter((r) => r.type === 'show') },
    { id: 'upcoming', label: 'Coming Soon', method: 'Release date in the future, soonest first', items: upcoming },
  ];

  // Genre rows: genres with enough titles, largest first (ties by name) — a count, not a quality claim.
  const byGenre = new Map();
  for (const row of released) for (const id of genreIdsOf(row)) byGenre.set(id, [...(byGenre.get(id) ?? []), row]);
  const names = new Map(genres.map((g) => [g.id, g.name]));
  [...byGenre.entries()]
    .filter(([, list]) => list.length >= MIN_GENRE_TITLES)
    .sort((a, b) => b[1].length - a[1].length || String(names.get(a[0]) ?? a[0]).localeCompare(String(names.get(b[0]) ?? b[0])))
    .slice(0, MAX_GENRE_ROWS)
    .forEach(([id, list]) => out.push({ id: `genre_${id}`, label: names.get(id) ?? id, method: 'Released titles in this genre, newest first', genreId: id, items: list }));

  return out
    .filter((row) => row.items.length > 0)
    .map(({ items, ...row }) => ({ ...row, titles: items.slice(0, ROW_SIZE).map(toCard) }));
}
