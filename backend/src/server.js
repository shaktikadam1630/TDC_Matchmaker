import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { Matchmaker } from './models/Matchmaker.js';
import { runSeed } from './seed/seed.js';

async function main() {
  await connectDb();

  if (env.AUTO_SEED && (await Matchmaker.estimatedDocumentCount()) === 0) {
    logger.info('Empty database detected - seeding demo data');
    await runSeed();
  }

  const server = createApp().listen(env.PORT, () =>
    logger.info(`API listening on :${env.PORT} (${env.NODE_ENV}) - AI ${env.OPENAI_API_KEY ? 'enabled' : 'disabled (rule-based fallback)'}`),
  );

  // Graceful shutdown: stop accepting requests, let in-flight ones finish, then close Mongo.
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
