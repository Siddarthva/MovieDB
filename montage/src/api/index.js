import { getStatus } from '../engine/timeEngine';

export const TYPE_MOVIE = 'movie';
export const TYPE_SHOW = 'show';

/**
 * Where the browser sends API calls. Defaults to same-origin "/api" (Vite proxies it in development,
 * nginx proxies it in Docker). Set VITE_API_URL only for a cross-origin API.
 */
const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const PAGE_SIZE = 200;
const MAX_CATALOG = 2000;

/** Failure talking to the API. `kind` is 'network' | 'server' | 'not_found' | 'client'. */
export class ApiError extends Error {
  constructor({ status = 0, code = 'unknown', message, requestId = null, kind }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.kind = kind ?? (status === 404 ? 'not_found' : status >= 500 || status === 0 ? 'server' : 'client');
  }

  /** True when retrying later could plausibly succeed. */
  get retryable() {
    return this.kind === 'network' || this.status >= 500 || this.status === 429;
  }
}

const asArray = (value) => (Array.isArray(value) ? value : []);

async function requestRaw(path, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError({ kind: 'network', code: 'network_error', message: 'Cannot reach the MovieDB service. Check your connection.' });
  }

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      /* non-JSON error page (e.g. proxy) */
    }
    throw new ApiError({
      status: response.status,
      code: body?.error?.code ?? 'http_error',
      message: body?.error?.message ?? body?.message ?? `Request failed (${response.status}).`,
      requestId: body?.error?.requestId ?? response.headers.get('x-request-id'),
    });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    // A 200 that is not JSON usually means the API is not reachable at this path (SPA index.html served instead).
    throw new ApiError({ status: 502, code: 'bad_response', message: 'The server returned an unexpected response. Is the API configured correctly?' });
  }
  return { data, total: Number(response.headers.get('x-total-count')) };
}

const request = async (path, options) => (await requestRaw(path, options)).data;

function normalizeTitle(title) {
  const media = title?.media ?? {};
  const people = title?.people ?? {};
  const poster = title?.poster ?? media.poster ?? null;
  const backdrop = title?.backdrop ?? media.backdrop ?? null;
  const trailer = title?.trailer ?? media.trailer ?? null;
  return {
    ...title,
    releaseDate: title?.releaseDate ?? title?.release_date ?? null,
    poster,
    backdrop,
    trailer,
    posterUrl: poster,
    backdropUrl: backdrop,
    media: { ...media, poster, backdrop, trailer },
    details: { ...(title?.details ?? {}), synopsis: title?.details?.synopsis ?? title?.synopsis ?? '', runtime: title?.details?.runtime ?? title?.runtime ?? null },
    classification: {
      ...(title?.classification ?? {}),
      genres: asArray(title?.classification?.genres),
      rating: title?.classification?.rating ?? title?.censor_rating ?? 'NR',
    },
    people: {
      directorId: people.directorId ?? null,
      composerId: people.composerId ?? null,
      writerIds: asArray(people.writerIds),
      castIds: asArray(people.castIds),
    },
  };
}

const normalizePerson = (person) => ({ ...person, roles: asArray(person?.roles), image: person?.image ?? person?.imageUrl ?? person?.image_url ?? null });

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

/** Every title, fetched in pages of PAGE_SIZE (bounded). */
async function fetchAllTitles() {
  const items = [];
  let total = Infinity;
  while (items.length < Math.min(total, MAX_CATALOG)) {
    const page = await requestRaw(`/titles${qs({ limit: PAGE_SIZE, offset: items.length })}`);
    const rows = asArray(page.data);
    items.push(...rows);
    total = Number.isFinite(page.total) ? page.total : items.length;
    if (rows.length < PAGE_SIZE) break;
  }
  return items.map(normalizeTitle);
}

let catalogPromise = null;

/** Home rows + full title list + people + genres. Cached; a failure is NOT cached, so retry works. */
export function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([request('/home'), fetchAllTitles(), request('/people'), request('/genres')])
      .then(([categories, titles, people, genres]) => {
        const normalizedPeople = asArray(people).map(normalizePerson);
        return {
          categories: asArray(categories).map((row) => ({ ...row, titles: asArray(row.titles).map(normalizeTitle) })),
          titles,
          people: normalizedPeople,
          genres: asArray(genres),
          titleLookup: new Map(titles.map((title) => [title.id, title])),
          peopleLookup: new Map(normalizedPeople.map((person) => [person.id, person])),
        };
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

export function resetCatalog() {
  catalogPromise = null;
}

export const getHealth = () => request('/health/ready');

export async function getTitles(type = null) {
  const catalog = await getCatalog();
  return type ? catalog.titles.filter((title) => title.type === type) : catalog.titles;
}

export async function getFilmography(personId, options) {
  return asArray(await request(`/people/${encodeURIComponent(personId)}/credits`, options));
}

export function isValidTitle(title) {
  return Boolean(title && typeof title.id === 'string' && typeof title.title === 'string' && (title.type === TYPE_MOVIE || title.type === TYPE_SHOW));
}

export function assertType(title, expectedType) {
  return isValidTitle(title) && title.type === expectedType;
}

export const api = {
  getCatalog,
  getHealth,
  getTitles,
  getFilmography,
  getMovies: () => getTitles(TYPE_MOVIE),
  getShows: () => getTitles(TYPE_SHOW),
  getAllTitles: () => getTitles(),
  getUpcoming: async () => (await getTitles()).filter((title) => getStatus(title) === 'upcoming'),
  getGenres: async () => (await getCatalog()).genres,
  getPeople: async () => (await getCatalog()).people,
  getById: async (id, options) => normalizeTitle(await request(`/titles/${encodeURIComponent(id)}`, options)),
  getPerson: async (id, options) => normalizePerson(await request(`/people/${encodeURIComponent(id)}`, options)),
  getRelated: async (id, options) => asArray(await request(`/titles/${encodeURIComponent(id)}/related?limit=8`, options)).map(normalizeTitle),

  /** Server-side search/filter/sort/paginate. Resolves to { items, total }. */
  searchTitles: async ({ q, type, genre, year, sort, limit = 24, offset = 0 } = {}, options) => {
    const { data, total } = await requestRaw(`/titles${qs({ q, type, genre, year, sort, limit, offset })}`, options);
    return { items: asArray(data).map(normalizeTitle), total: Number.isFinite(total) ? total : asArray(data).length };
  },
  searchPeople: async (q, options) => asArray(await request(`/people${qs({ q, limit: 8 })}`, options)).map(normalizePerson),
};
