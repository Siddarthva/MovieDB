import { createApp } from './src/app.js';
import { ConfigError, loadConfig, loadEnvFiles } from './src/config.js';
import { checkDatabase, createDbClient } from './src/db/client.js';
import { createLogger } from './src/logger.js';
import { createSupabaseTokenVerifier } from './src/middleware.js';

loadEnvFiles();

let loaded;
try {
  loaded = loadConfig();
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  // Plain stderr: the logger needs a valid config, and these messages contain no secret values.
  console.error(`\nMovieDB API cannot start.\n${error.message}\n\nSee backend/.env.example and docs/DEPLOYMENT.md.\n`);
  process.exit(1);
}

const { config, warnings } = loaded;
const logger = createLogger({ level: config.logLevel });
warnings.forEach((message) => logger.warn(message));

const db = createDbClient(config);
const app = createApp({ config, logger, db, verifyToken: createSupabaseTokenVerifier(db) });

const server = app.listen(config.port, async () => {
  logger.info('listening', { port: config.port, env: config.nodeEnv, supabaseHost: config.supabaseHost, keyKind: config.keyKind });

  // Startup diagnostics: the server stays up so /api/health/live works, but readiness reports the failure.
  const database = await checkDatabase(db);
  if (database.status === 'up') logger.info('database reachable', { latencyMs: database.latencyMs });
  else logger.error('database NOT reachable', { category: database.category, table: database.table, hint: database.hint, latencyMs: database.latencyMs, supabaseHost: config.supabaseHost });
});

server.requestTimeout = 30_000;
server.keepAliveTimeout = 65_000; // above typical proxy idle timeouts

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutting down', { signal });
  server.close((error) => {
    if (error) logger.error('error during shutdown', { message: error.message });
    process.exit(error ? 1 : 0);
  });
  server.closeIdleConnections();
  setTimeout(() => {
    logger.warn('forcing shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('unhandled rejection', { message: String(reason?.message ?? reason) }));
