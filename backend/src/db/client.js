import { createClient } from '@supabase/supabase-js';
import { classifyDbError } from '../errors.js';

/** Supabase client that never persists sessions and aborts any request after `timeoutMs`. */
export function createDbClient(config) {
  const timeoutFetch = (input, init = {}) => {
    const timeout = AbortSignal.timeout(config.dbTimeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };

  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: timeoutFetch },
  });
}

/** Tables and one column each, used to prove the schema the API depends on is present. */
const REQUIRED = [
  ['titles', 'id,title,type,year,release_date,poster,backdrop,trailer,synopsis,runtime,genre,censor_rating'],
  ['people', 'id,name,image_url,image'],
  ['genres', 'id,name'],
  ['title_genres', 'title_id,genre_id'],
  ['title_credits', 'title_id,person_id,role,department'],
];

/**
 * Probe the database. Returns a plain object; never throws.
 * `status` is 'up' | 'down'. On failure `category` and `hint` explain the failure class.
 */
export async function checkDatabase(db) {
  const started = performance.now();
  try {
    const results = await Promise.all(REQUIRED.map(async ([table, columns]) => {
      const { error } = await db.from(table).select(columns).limit(1);
      return { table, error };
    }));

    const failed = results.find((r) => r.error);
    if (failed) {
      const info = classifyDbError(failed.error);
      return {
        status: 'down',
        latencyMs: Math.round(performance.now() - started),
        category: info.category,
        hint: info.hint,
        table: failed.table,
      };
    }

    // Verify the foreign-key embeddings the API's nested selects depend on.
    const rel = await db.from('titles').select('id, title_genres(genre_id)').limit(1);
    if (rel.error) {
      const info = classifyDbError(rel.error);
      return { status: 'down', latencyMs: Math.round(performance.now() - started), category: info.category === 'unknown' ? 'schema' : info.category, hint: info.hint || 'The titles -> title_genres relationship could not be resolved.', table: 'titles' };
    }

    return { status: 'up', latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    const info = classifyDbError(error);
    return { status: 'down', latencyMs: Math.round(performance.now() - started), category: info.category, hint: info.hint };
  }
}
