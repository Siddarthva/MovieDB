import { getStatus } from '../engine/timeEngine';

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
  };

  return normalized;
}

function getDnaSignals(title) {
  const dna = title?.dna ?? {};
  const metrics = title?.metrics ?? {};
  const ratings = metrics?.ratings ?? {};
  const cineScore = asNumber(title?.cine_score ?? ratings?.cineScore, 0);

  const intensity = asNumber(title?.dna_intensity ?? dna?.energy, 0);
  const complexity = asNumber(title?.dna_complexity ?? dna?.scale, 0);
  const emotion = asNumber(title?.dna_emotion ?? dna?.mood, 0);
  const pace = asNumber(title?.dna_pace ?? dna?.pace, 0);
  const warmth = asNumber(dna?.warmth, 0);
  const darkness = asNumber(title?.dna_darkness, Math.max(0, 10 - warmth));
  const spectacle = asNumber(title?.dna_spectacle, Math.min(10, (complexity + intensity) / 2));

  return { cineScore, intensity, complexity, emotion, darkness, spectacle, pace };
}

export function buildDnaCategories(masterTitles) {
  const titles = asArray(masterTitles).map(normalizeTitle);
  const cutoff = new Date('2026-04-05T00:00:00Z');
  const hasGenre = (title, genreId) => title?.classification?.genres?.includes(genreId);
  const topRated = titles
    .slice()
    .sort((a, b) => getDnaSignals(b).cineScore - getDnaSignals(a).cineScore);

  const withFallback = (bucket) => {
    const seen = new Set();
    const merged = [];

    const add = (title) => {
      if (!title?.id || seen.has(title.id)) return;
      seen.add(title.id);
      merged.push(title);
    };

    bucket.forEach(add);
    topRated.forEach(add);

    return merged.slice(0, 10);
  };

  const categories = [
    {
      id: 'masterpieces',
      label: 'The Masterpieces',
      titles: titles.filter((title) => getDnaSignals(title).cineScore >= 9.5),
    },
    {
      id: 'high_octane_action',
      label: 'High-Octane Action',
      titles: titles.filter((title) => hasGenre(title, 'action') && getDnaSignals(title).intensity > 7),
    },
    {
      id: 'mind_bending_scifi',
      label: 'Mind-Bending Sci-Fi',
      titles: titles.filter((title) => hasGenre(title, 'sci_fi') && getDnaSignals(title).complexity > 7),
    },
    {
      id: 'emotional_epics',
      label: 'Emotional Epics',
      titles: titles.filter((title) => hasGenre(title, 'epic') && getDnaSignals(title).emotion > 7),
    },
    {
      id: 'dark_gritty',
      label: 'Dark & Gritty',
      titles: titles.filter((title) => getDnaSignals(title).darkness > 8),
    },
    {
      id: 'pure_spectacle',
      label: 'Pure Spectacle',
      titles: titles.filter((title) => getDnaSignals(title).spectacle > 8),
    },
    {
      id: 'fast_paced_thrills',
      label: 'Fast-Paced Thrills',
      titles: titles.filter((title) => getDnaSignals(title).pace > 8),
    },
    {
      id: 'upcoming_anticipation',
      label: 'Upcoming Anticipation',
      titles: titles.filter((title) => {
        if (!title?.releaseDate) return false;
        const release = new Date(`${title.releaseDate}T00:00:00Z`);
        return release > cutoff;
      }),
    },
    {
      id: 'cinematic_classics',
      label: 'Cinematic Classics',
      titles: titles.filter((title) => asNumber(title?.year, 9999) < 2000),
    },
    {
      id: 'hidden_gems',
      label: 'Hidden Gems',
      titles: titles.filter((title) => {
        const signals = getDnaSignals(title);
        return signals.cineScore < 8.5 && signals.complexity > 8;
      }),
    },
  ];

  return categories.map((category) => {
    const ranked = category.titles
      .slice()
      .sort((a, b) => getDnaSignals(b).cineScore - getDnaSignals(a).cineScore);

    return {
      ...category,
      titles: withFallback(ranked),
    };
  });
}

async function request(path) {
  if (!BASE_URL) {
    throw new Error('VITE_API_URL is missing from montage/.env');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

async function loadCatalog() {
  if (!catalogCache.promise) {
    catalogCache.promise = Promise.all([
      request('/titles'),
      request('/people'),
      request('/genres'),
    ])
      .then(([titles, people, genres]) => {
        const normalizedTitles = asArray(titles).map(normalizeTitle);
        return {
          titles: normalizedTitles,
          people: asArray(people),
          genres: asArray(genres),
          categories: buildDnaCategories(normalizedTitles),
          titleLookup: new Map(normalizedTitles.map((title) => [title.id, title])),
          peopleLookup: new Map(asArray(people).map((person) => [person.id, person])),
        };
      })
      .catch((error) => {
        catalogCache.promise = null;
        throw error;
      });
  }

  catalogCache.value = await catalogCache.promise;
  return catalogCache.value;
}

export async function getCatalog() {
  return loadCatalog();
}

export async function getHealth() {
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
      title.people.directorId === personId ||
      title.people.composerId === personId ||
      title.people.writerIds.includes(personId) ||
      title.people.castIds.includes(personId),
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
    const title = await request(`/titles/${encodeURIComponent(id)}`);
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
      title.classification.genres.some((genreId) => genreId.toLowerCase().includes(q)) ||
      title.people.directorId?.toLowerCase().includes(q) ||
      title.people.writerIds.some((id) => id.toLowerCase().includes(q)) ||
      title.people.castIds.some((id) => id.toLowerCase().includes(q)),
    );
  },
};
