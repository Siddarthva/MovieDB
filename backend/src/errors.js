/** An error whose message is safe to show to API clients. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'not_found', `${what} not found.`);
export const badRequest = (message, details) => new AppError(400, 'bad_request', message, details);

/**
 * Turn whatever supabase-js / PostgREST / fetch produced into a stable category.
 * Network failures (DNS, TLS, timeout...) are deliberately kept apart from SQL,
 * permission and schema problems, because they need completely different fixes.
 *
 * Returns { category, status, code, hint }. `hint` is operator-facing guidance and is
 * only ever logged or shown on the health endpoint, never sent for normal API calls.
 */
export function classifyDbError(error) {
  if (!error) return { category: 'unknown', status: 500, code: 'internal_error', hint: '' };

  const text = [error.message, error.details, error.hint, error.cause?.code, error.cause?.message, error.name]
    .filter(Boolean)
    .join(' ');
  const pg = String(error.code ?? '');

  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(text)) {
    return {
      category: 'dns', status: 503, code: 'database_unavailable',
      hint: 'The Supabase hostname does not resolve. Check SUPABASE_URL for typos, and in the Supabase dashboard confirm the project exists and is not paused or deleted.',
    };
  }
  if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|socket hang up/i.test(text)) {
    return { category: 'connection', status: 503, code: 'database_unavailable', hint: 'The host resolved but refused or dropped the connection. Check network, proxy and firewall settings.' };
  }
  if (/ETIMEDOUT|timeout|timed out|AbortError|aborted/i.test(text)) {
    return { category: 'timeout', status: 504, code: 'database_timeout', hint: 'The database did not answer within DB_TIMEOUT_MS.' };
  }
  if (/CERT|SSL|TLS|self.signed|unable to verify/i.test(text)) {
    return { category: 'tls', status: 503, code: 'database_unavailable', hint: 'TLS negotiation failed. Check SUPABASE_URL scheme and any intercepting proxy.' };
  }
  if (/fetch failed/i.test(text)) {
    return { category: 'connection', status: 503, code: 'database_unavailable', hint: 'The request could not be sent to Supabase (unspecific network failure).' };
  }

  if (pg === 'PGRST116') return { category: 'not_found', status: 404, code: 'not_found', hint: '' };
  if (pg === '23505') return { category: 'conflict', status: 409, code: 'conflict', hint: '' };
  if (pg === '23503') return { category: 'reference', status: 409, code: 'invalid_reference', hint: '' };
  if (pg === '23502' || pg === '23514' || pg === '22P02' || pg === '22007') return { category: 'invalid', status: 400, code: 'invalid_data', hint: '' };

  if (pg === '42501' || /row-level security|permission denied/i.test(text)) {
    return { category: 'permission', status: 500, code: 'database_misconfigured', hint: 'Row Level Security or grants reject this operation for the configured key. Use the service-role key on the server.' };
  }
  if (/PGRST30\d|invalid api key|jwt|apikey/i.test(`${pg} ${text}`) || error.status === 401 || error.status === 403) {
    return { category: 'auth', status: 500, code: 'database_misconfigured', hint: 'Supabase rejected the API key. Check SUPABASE_SERVICE_ROLE_KEY matches this project.' };
  }
  if (pg === '42P01' || pg === '42703' || /^PGRST20\d$/.test(pg) || /schema cache|does not exist|Could not find/i.test(text)) {
    return { category: 'schema', status: 500, code: 'database_misconfigured', hint: 'A required table, column or relationship is missing. Compare the database with database.sql / db/migrations.' };
  }

  return { category: 'unknown', status: 500, code: 'internal_error', hint: '' };
}

/** Wrap a Supabase `{ error }` result into a throwable carrying its classification. */
export class DatabaseError extends AppError {
  constructor(source) {
    const info = classifyDbError(source);
    const publicMessage = {
      database_unavailable: 'The database is currently unavailable.',
      database_timeout: 'The database took too long to respond.',
      database_misconfigured: 'The service is misconfigured. Please contact the administrator.',
      not_found: 'Resource not found.',
      conflict: 'A record with this identifier already exists.',
      invalid_reference: 'The request references a record that does not exist or is still in use.',
      invalid_data: 'The submitted data was rejected by the database.',
      internal_error: 'Internal server error.',
    }[info.code];
    super(info.status, info.code, publicMessage);
    this.name = 'DatabaseError';
    this.category = info.category;
    this.hint = info.hint;
    this.source = { message: source?.message, code: source?.code, details: source?.details };
  }
}
