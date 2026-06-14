import { getStatus } from '../engine/timeEngine';
import { MOVIES } from '../../../movies.js';
import { SHOWS } from '../../../backend/data/shows.js';
import { PEOPLE } from '../../../people.js';
import { GENRES } from '../../../genres.js';

export const TYPE_MOVIE = 'movie';
export const TYPE_SHOW = 'show';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const catalogCache = {
  promise: null,
  value: null,
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function normalizeTitle(title) {
  const media = title?.media ?? {};
  const people = title?.people ?? {};
  const normalized = {
    ...title,
    releaseDate: title?.releaseDate ?? title?.release_date ?? null,
    poster: title?.poster ?? media?.poster ?? null,
    backdrop: title?.backdrop ?? media?.backdrop ?? null,
    trailer: title?.trailer ?? media?.trailer ?? null,
    posterUrl: title?.poster ?? media?.poster ?? null,
    backdropUrl: title?.backdrop ?? media?.backdrop ?? null,
    media: {
      ...media,
      poster: title?.poster ?? media?.poster ?? null,
      backdrop: title?.backdrop ?? media?.backdrop ?? null,
      trailer: title?.trailer ?? media?.trailer ?? null,
    },
    details: {
      ...(title?.details ?? {}),
      synopsis: title?.details?.synopsis ?? title?.synopsis ?? '',
      runtime: title?.details?.runtime ?? title?.runtime ?? null,
    },
    classification: {
      ...(title?.classification ?? {}),
      genres: asArray(title?.classification?.genres),
      rating: title?.classification?.rating ?? title?.censor_rating ?? title?.rating ?? 'NR',
    },
    people: {
      directorId: people.directorId ?? null,
      composerId: people.composerId ?? null,
      writerIds: asArray(people.writerIds),
      castIds: asArray(people.castIds),
    },
  };

  return normalized;
}

export function buildDnaCategories(masterTitles) {
  const titles = asArray(masterTitles).map(normalizeTitle);
  const cutoff = new Date('2026-04-05T00:00:00Z');

  // 1. Trending Movies (Highly popular movies)
  const trendingMovies = titles
    .filter((t) => t.type === 'movie')
    .sort((a, b) => (b.metrics?.popularity ?? 0) - (a.metrics?.popularity ?? 0))
    .slice(0, 10);

  // 2. Latest Releases (Released recently)
  const latestReleases = titles
    .filter((t) => t.releaseDate && new Date(t.releaseDate) <= cutoff)
    .sort((a, b) => b.year - a.year || new Date(b.releaseDate) - new Date(a.releaseDate))
    .slice(0, 10);

  // 3. Popular Shows (TV Shows sorted by popularity)
  const popularShows = titles
    .filter((t) => t.type === 'show')
    .sort((a, b) => (b.metrics?.popularity ?? 0) - (a.metrics?.popularity ?? 0))
    .slice(0, 10);

  // 4. Critically Acclaimed (Sorted by critic/cinescore or ratings)
  const criticallyAcclaimed = titles
    .sort((a, b) => (b.metrics?.ratings?.critic ?? 0) - (a.metrics?.ratings?.critic ?? 0))
    .slice(0, 10);

  // 5. Recently Added (By release date or year desc)
  const recentlyAdded = titles
    .sort((a, b) => b.year - a.year)
    .slice(0, 10);

  return [
    {
      id: 'trending_movies',
      label: 'Trending Movies',
      titles: trendingMovies,
    },
    {
      id: 'latest_releases',
      label: 'Latest Releases',
      titles: latestReleases,
    },
    {
      id: 'popular_shows',
      label: 'Popular TV Shows',
      titles: popularShows,
    },
    {
      id: 'critically_acclaimed',
      label: 'Critically Acclaimed',
      titles: criticallyAcclaimed,
    },
    {
      id: 'recently_added',
      label: 'Recently Added',
      titles: recentlyAdded,
    },
  ];
}

async function request(path) {

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

function loadLocalCatalog() {
  const normalizedTitles = [...asArray(MOVIES), ...asArray(SHOWS)].map(normalizeTitle);
  const genres = Object.entries(GENRES).map(([id, name]) => ({ id, name }));
  const people = asArray(PEOPLE).map((person) => ({
    ...person,
    imageUrl: person.imageUrl ?? person.image_url ?? person.image ?? null,
    image_url: person.image_url ?? person.imageUrl ?? person.image ?? null,
    roles: asArray(person.roles),
  }));

  return {
    titles: normalizedTitles,
    people,
    genres,
    categories: buildDnaCategories(normalizedTitles),
    titleLookup: new Map(normalizedTitles.map((title) => [title.id, title])),
    peopleLookup: new Map(people.map((person) => [person.id, person])),
  };
}

async function loadCatalog() {
  if (!catalogCache.promise) {
    catalogCache.promise = (async () => {
      try {
        const [categories, titles, people, genres] = await Promise.all([
          request('/home'),
          request('/titles').catch(() => []),
          request('/people').catch(() => []),
          request('/genres').catch(() => []),
        ]);

        const normalizedTitles = asArray(titles).map(normalizeTitle);
        const catalog = {
          titles: normalizedTitles,
          people: asArray(people),
          genres: asArray(genres),
          categories,
          titleLookup: new Map(normalizedTitles.map((title) => [title.id, title])),
          peopleLookup: new Map(asArray(people).map((person) => [person.id, person])),
        };

        return catalog;
      } catch {
        return loadLocalCatalog();
      }
    })();
  }

  catalogCache.value = await catalogCache.promise;
  return catalogCache.value;
}

export async function getCatalog() {
  return loadCatalog();
}

export async function getHealth() {
  if (!BASE_URL) return { ok: true, database: 'local' };
  return request('/health');
}

export async function getTitles(type = null) {
  const catalog = await loadCatalog();
  return type ? catalog.titles.filter((title) => title.type === type) : catalog.titles;
}

export async function getPeople() {
  const catalog = await loadCatalog();
  return catalog.people;
}

export async function getDnaCategories() {
  const catalog = await loadCatalog();
  return catalog.categories;
}

export async function getGenres() {
  const catalog = await loadCatalog();
  return catalog.genres;
}

export async function getTitle(id) {
  const catalog = await loadCatalog();
  return catalog.titleLookup.get(id) ?? null;
}

export async function getPerson(id) {
  const catalog = await loadCatalog();
  return catalog.peopleLookup.get(id) ?? null;
}

export async function getFilmography(personId) {
  const catalog = await loadCatalog();
  return catalog.titles
    .filter((title) =>
      title.people?.directorId === personId ||
      title.people?.composerId === personId ||
      asArray(title.people?.writerIds).includes(personId) ||
      asArray(title.people?.castIds).includes(personId),
    )
    .sort((a, b) => b.year - a.year);
}

export function isValidTitle(title) {
  return Boolean(
    title &&
    typeof title.id === 'string' &&
    typeof title.title === 'string' &&
    (title.type === TYPE_MOVIE || title.type === TYPE_SHOW) &&
    title.media &&
    title.classification?.genres,
  );
}

export function assertType(title, expectedType) {
  if (!isValidTitle(title)) return false;
  if (title.type !== expectedType) {
    console.warn(`[API] Type mismatch: expected "${expectedType}", got "${title.type}" (id: ${title.id})`);
    return false;
  }
  return true;
}

export const api = {
  getMovies: async () => getTitles(TYPE_MOVIE),
  getShows: async () => getTitles(TYPE_SHOW),
  getUpcoming: async () => {
    const titles = await getTitles();
    return titles.filter((title) => getStatus(title) === 'upcoming');
  },
  getById: async (id) => {
    const title = await request(`/title/${encodeURIComponent(id)}`);
    if (!title) throw new Error('Title not found');
    return normalizeTitle(title);
  },
  getAllTitles: async () => getTitles(),
  getPeople,
  getGenres,
  getDnaCategories,
  getCatalog,
  getHealth,
  getTitle,
  getPerson,
  getFilmography,
  search: async (query) => {
    const q = String(query ?? '').trim().toLowerCase();
    if (!q) return [];
    const catalog = await loadCatalog();
    return catalog.titles.filter((title) =>
      title.title.toLowerCase().includes(q) ||
      asArray(title.classification?.genres).some((genreId) => genreId.toLowerCase().includes(q)) ||
      title.people?.directorId?.toLowerCase().includes(q) ||
      asArray(title.people?.writerIds).some((id) => id.toLowerCase().includes(q)) ||
      asArray(title.people?.castIds).some((id) => id.toLowerCase().includes(q)),
    );
  },
};
