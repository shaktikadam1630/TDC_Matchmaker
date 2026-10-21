import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { isDbReady } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { loadCustomer } from '../middleware/loadCustomer.js';
import { objectId, validate } from '../middleware/validate.js';
import * as auth from '../controllers/authController.js';
import * as customers from '../controllers/customerController.js';
import * as matches from '../controllers/matchController.js';

const router = Router();

const idParam = z.object({ id: objectId });
const idAndProfile = z.object({ id: objectId, profileId: objectId });
const idAndNote = z.object({ id: objectId, noteId: objectId });

// Brute-force protection for the login endpoint only.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in a few minutes.' } },
});

// Liveness/readiness probe for Docker, ALB and App Runner.
router.get('/health', (_req, res) => {
  const ready = isDbReady();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'degraded', db: ready });
});

router.post('/auth/login', loginLimiter, validate({ body: auth.loginSchema }), auth.login);
router.get('/auth/me', requireAuth, auth.me);

router.use('/customers', requireAuth);
router.get('/customers', validate({ query: customers.listQuery }), customers.list);
router.get('/customers/stats', customers.stats); // must precede /:id

const one = [validate({ params: idParam }), loadCustomer];
router.get('/customers/:id', ...one, customers.get);
router.patch('/customers/:id/status', validate({ params: idParam, body: customers.statusBody }), loadCustomer, customers.updateStatus);
router.post('/customers/:id/notes', validate({ params: idParam, body: customers.noteBody }), loadCustomer, customers.addNote);
router.delete('/customers/:id/notes/:noteId', validate({ params: idAndNote }), loadCustomer, customers.deleteNote);

router.get('/customers/:id/matches', validate({ params: idParam, query: matches.matchesQuery }), loadCustomer, matches.suggest);
router.post('/customers/:id/matches/ask', validate({ params: idParam, body: matches.askBody }), loadCustomer, matches.ask);
router.get('/customers/:id/sent', ...one, matches.listSent);
router.post('/customers/:id/matches/:profileId/intro', validate({ params: idAndProfile }), loadCustomer, matches.draftIntro);
router.post('/customers/:id/matches/:profileId/send', validate({ params: idAndProfile, body: matches.sendBody }), loadCustomer, matches.send);

export default router;
