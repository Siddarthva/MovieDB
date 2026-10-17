const asString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const asArray = (value) => (Array.isArray(value) ? value : []);
const one = (value) => (Array.isArray(value) ? value[0] : value) ?? null;

const ACTOR_ROLES = new Set(['cast', 'actor', 'actress', 'voice_actor', 'voice actor']);

export const roleKey = (role) => asString(role)?.toLowerCase().replace(/\s+/g, '_') ?? null;

export function roleLabel(role) {
  const key = roleKey(role);
  if (!key) return 'Crew';
  return key.replace(/[_-]/g, ' ').split(' ').filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
}

/** 'Cast' or 'Crew'. Uses the stored department, else infers from the role. */
export function departmentOf(role, department) {
  const declared = asString(department)?.toLowerCase();
  if (declared === 'cast') return 'Cast';
  if (declared === 'crew') return 'Crew';
  if (declared) return asString(department);
  return ACTOR_ROLES.has(roleKey(role) ?? '') ? 'Cast' : 'Crew';
}

export function genreIdsOf(row) {
  const ids = asArray(row.title_genres).map((g) => asString(g.genre_id)).filter(Boolean);
  if (ids.length) return [...new Set(ids)];
  const primary = asString(row.genre);
  return primary ? [primary] : [];
}

/** Compact title used by list endpoints. */
export function toListItem(row) {
  return {
    id: asString(row.id),
    title: asString(row.title),
    type: asString(row.type),
    year: asNumber(row.year),
    releaseDate: asString(row.release_date),
    poster: asString(row.poster),
    backdrop: asString(row.backdrop),
    censor_rating: asString(row.censor_rating),
    classification: { genres: genreIdsOf(row), rating: asString(row.censor_rating) },
  };
}

/** Smaller still, for home rows. */
export function toCard(row) {
  const item = toListItem(row);
  return {
    id: item.id,
    title: item.title,
    poster: item.poster,
    backdrop: item.backdrop,
    censor_rating: item.censor_rating ?? 'NR',
    year: item.year,
    releaseDate: item.releaseDate,
    type: item.type,
  };
}

export function toCredits(rows) {
  return asArray(rows)
    .map((credit) => {
      const person = one(credit.people);
      const rawRole = asString(credit.role);
      return {
        personId: asString(credit.person_id ?? person?.id),
        name: asString(person?.name),
        role: roleLabel(rawRole),
        roleKey: rawRole?.toLowerCase() ?? null,
        department: departmentOf(rawRole, credit.department),
        imageUrl: asString(person?.image_url ?? person?.image),
      };
    })
    .filter((c) => c.personId && c.name);
}

export function toPerson(row) {
  const url = asString(row.image_url ?? row.image);
  return { id: asString(row.id), name: asString(row.name), roles: asArray(row.roles), image: url, imageUrl: url, image_url: url };
}

export function toGenreRelations(rows) {
  return asArray(rows)
    .map((row) => {
      const genre = one(row.genres);
      return { titleId: asString(row.title_id), genreId: asString(row.genre_id ?? genre?.id), name: asString(genre?.name) };
    })
    .filter((r) => r.titleId && r.genreId);
}

/** Full title: same shape as the 1.x API, minus the placeholder `showMeta`/`episodes`. */
export function toDetail(row, creditRows) {
  const credits = toCredits(creditRows);
  const idsFor = (...roles) => [...new Set(credits.filter((c) => roles.includes(c.roleKey)).map((c) => c.personId))];
  const genreRelations = asArray(row.title_genres);

  return {
    id: asString(row.id),
    type: asString(row.type),
    title: asString(row.title),
    year: asNumber(row.year),
    releaseDate: asString(row.release_date),
    censor_rating: asString(row.censor_rating),
    media: { poster: asString(row.poster), backdrop: asString(row.backdrop), trailer: asString(row.trailer) },
    details: { synopsis: asString(row.synopsis), runtime: asString(row.runtime) },
    classification: {
      genres: genreIdsOf(row),
      genreNames: genreRelations.map((g) => asString(one(g.genres)?.name)).filter(Boolean),
      rating: asString(row.censor_rating),
    },
    people: {
      directorId: idsFor('director')[0] ?? null,
      writerIds: idsFor('writer', 'screenwriter'),
      castIds: idsFor(...ACTOR_ROLES),
      composerId: idsFor('composer')[0] ?? null,
    },
    credits,
    creditGroups: {
      Cast: credits.filter((c) => c.department === 'Cast'),
      Crew: credits.filter((c) => c.department !== 'Cast'),
    },
  };
}

export function toFilmography(rows) {
  return asArray(rows)
    .map((row) => {
      const title = one(row.titles);
      return {
        titleId: asString(row.title_id ?? title?.id),
        title: asString(title?.title),
        year: asNumber(title?.year),
        type: asString(title?.type),
        poster: asString(title?.poster),
        role: roleLabel(row.role),
        department: departmentOf(row.role, row.department),
      };
    })
    .filter((r) => r.titleId && r.title)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
}
