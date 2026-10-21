/** Usage: npm run seed            (wipes and reseeds; refuses in production without --force) */
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { runSeed } from './seed.js';

if (env.isProd && !process.argv.includes('--force')) {
  console.error('Refusing to wipe a production database. Re-run with --force if you are sure.');
  process.exit(1);
}

try {
  await connectDb();
  await runSeed({ reset: true });
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
