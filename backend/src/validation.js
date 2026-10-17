import { z } from 'zod';
import { AppError } from './errors.js';

const id = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/, 'Use letters, digits, "_" or "-" (max 100 characters).');
const httpUrl = z.string().trim().max(2000).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Must be an http(s) URL.');
const optionalText = (max) => z.string().trim().max(max).transform((v) => v || null).nullable().optional();
const optionalUrl = httpUrl.or(z.literal('').transform(() => null)).nullable().optional();

export const idParam = z.object({ id });
export const titleGenreParams = z.object({ titleId: id, genreId: id });
export const titleCreditParams = z.object({ titleId: id, personId: id });

const intQuery = (min, max) => z.coerce.number().int().min(min).max(max);

export const titleListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(['movie', 'show']).optional(),
  status: z.enum(['released', 'upcoming']).optional(),
  genre: id.optional(),
  year: intQuery(1870, 2200).optional(),
  yearFrom: intQuery(1870, 2200).optional(),
  yearTo: intQuery(1870, 2200).optional(),
  sort: z.enum(['year_desc', 'year_asc', 'release_desc', 'title_asc', 'title_desc']).optional(),
  limit: intQuery(1, 200).optional(),
  offset: intQuery(0, 1_000_000).optional(),
});

export const peopleListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  limit: intQuery(1, 500).optional(),
  offset: intQuery(0, 1_000_000).optional(),
});

export const searchQuery = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters.').max(100),
  limit: intQuery(1, 50).optional(),
});

export const relatedQuery = z.object({ limit: intQuery(1, 24).optional() });

const releaseDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');
const titleFields = {
  title: z.string().trim().min(1).max(300),
  type: z.enum(['movie', 'show']),
  year: z.number().int().min(1870).max(2200).nullable().optional(),
  releaseDate: releaseDate.nullable().optional(),
  poster: optionalUrl,
  backdrop: optionalUrl,
  trailer: optionalUrl,
  synopsis: optionalText(5000),
  runtime: optionalText(40),
  censor_rating: optionalText(20),
  censorRating: optionalText(20),
};

export const titleCreateBody = z.object({ id, ...titleFields }).strict();
// `id` is accepted (the admin form resends it) but the URL parameter is authoritative.
export const titlePatchBody = z.object({ id: id.optional(), ...titleFields }).partial().strict();

export const personCreateBody = z.object({
  id,
  name: z.string().trim().min(1).max(200),
  image_url: optionalUrl,
  imageUrl: optionalUrl,
  image: optionalUrl,
}).strict();
export const personPatchBody = personCreateBody.omit({ id: true }).partial().strict();

export const genreCreateBody = z.object({ id, name: z.string().trim().min(1).max(100) }).strict();
export const genrePatchBody = z.object({ name: z.string().trim().min(1).max(100) }).strict();

export const titleGenreBody = z.object({ genre_id: id.optional(), genreId: id.optional(), id: id.optional() }).strict()
  .refine((b) => b.genre_id ?? b.genreId ?? b.id, { message: 'genre_id is required.' });

const role = z.string().trim().min(1).max(60);
export const creditBody = z.object({
  person_id: id.optional(),
  personId: id.optional(),
  role,
  department: z.enum(['cast', 'crew', 'Cast', 'Crew']).nullable().optional(),
}).strict().refine((b) => b.person_id ?? b.personId, { message: 'person_id is required.' });

export const creditDeleteQuery = z.object({ role: role.optional() });
export const creditDeleteBody = z.object({ personId: id, role }).strict();

/** Validate req[source] and place the parsed value on req.valid[source]. */
export function validate(source, schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({ field: issue.path.join('.') || source, message: issue.message }));
      return next(new AppError(400, 'validation_failed', 'The request is invalid.', fields));
    }
    req.valid = { ...(req.valid ?? {}), [source]: result.data };
    return next();
  };
}
