const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

/** Minimal structured JSON logger (one JSON object per line, written to stdout/stderr). */
export function createLogger({ level = 'info', stream = null, base = {} } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const write = (lvl, msg, fields) => {
    if (LEVELS[lvl] < threshold) return;
    const line = JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...base, ...fields });
    if (stream) stream(line);
    else (lvl === 'error' || lvl === 'warn' ? process.stderr : process.stdout).write(`${line}\n`);
  };

  return {
    debug: (msg, fields) => write('debug', msg, fields),
    info: (msg, fields) => write('info', msg, fields),
    warn: (msg, fields) => write('warn', msg, fields),
    error: (msg, fields) => write('error', msg, fields),
    child: (extra) => createLogger({ level, stream, base: { ...base, ...extra } }),
  };
}

/** Convert an Error into loggable fields without secrets (no request headers or bodies). */
export function errorFields(error) {
  return {
    err: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      category: error?.category,
      stack: error?.stack?.split('\n').slice(0, 6).join('\n'),
    },
  };
}
