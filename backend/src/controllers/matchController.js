import { z } from 'zod';
import { Customer } from '../models/Customer.js';
import { MatchAction } from '../models/MatchAction.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, notFound } from '../utils/AppError.js';
import { calcAge } from '../utils/dates.js';
import { serializePoolProfile } from '../utils/serializers.js';
import { evaluatePair, findMatches } from '../services/matchService.js';
import { generateIntro, parseQuery } from '../services/ai/aiService.js';
import { buildPredicate, describeFilters } from '../services/matching/queryParser.js';
import { composeEmail, sendEmail } from '../services/emailService.js';

export const matchesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minScore: z.coerce.number().min(0).max(100).default(0),
  ai: z.enum(['0', '1', 'true', 'false']).default('0').transform((v) => v === '1' || v === 'true'),
  verifiedOnly: z.enum(['0', '1', 'true', 'false']).default('0').transform((v) => v === '1' || v === 'true'),
});

export const askBody = z.object({
  question: z.string().trim().min(3, 'Ask a question of at least 3 characters').max(200),
  verifiedOnly: z.boolean().default(false),
});

export const sendBody = z.object({
  subject: z.string().trim().min(3, 'Subject is too short').max(150),
  body: z.string().trim().min(20, 'Message is too short').max(3000),
});

/** Statuses that should advance to "match_sent" once a first match goes out. */
const PRE_MATCH_STATUSES = ['onboarding', 'verified', 'searching'];

export const suggest = asyncHandler(async (req, res) => {
  res.json(await findMatches(req.customer, req.query));
});

/** POST .../ask - natural-language search over this customer's eligible matches. */
export const ask = asyncHandler(async (req, res) => {
  const { question, verifiedOnly } = req.body;
  const { filters, source } = await parseQuery(question, req.customer);
  const understood = describeFilters(filters);
  if (!understood.length) {
    throw new AppError(
      422,
      'Could not understand that. Try mentioning a city, profession, diet, age, height or income (e.g. "doctor in Mumbai, vegetarian, above 20 LPA").',
      'QUERY_NOT_UNDERSTOOD',
    );
  }
  const result = await findMatches(req.customer, { limit: 20, verifiedOnly, predicate: buildPredicate(filters) });
  res.json({ ...result, query: { question, understood, source } });
});

/** POST .../intro - drafts the email (AI when available) so the matchmaker can edit before sending. */
export const draftIntro = asyncHandler(async (req, res) => {
  const pair = await evaluatePair(req.customer, req.params.profileId);
  if (!pair) throw notFound('Profile');

  const profile = serializePoolProfile(pair.profile);
  const customer = { ...req.customer, age: calcAge(req.customer.dob) };
  const draft = await generateIntro(customer, profile, pair.match);
  res.json({
    draft,
    recipient: req.customer.email,
    profile,
    score: pair.match.score,
    tier: pair.match.tier,
  });
});

/** POST .../send - persists the send (exactly once per pair) and "delivers" the mock email. */
export const send = asyncHandler(async (req, res) => {
  const { profileId } = req.params;
  const pair = await evaluatePair(req.customer, profileId);
  if (!pair) throw notFound('Profile');

  const profile = serializePoolProfile(pair.profile);
  const email = composeEmail({ subject: req.body.subject, body: req.body.body, profile });

  // Reserve the pair first: the unique index makes concurrent double-clicks safe (second one -> 409).
  let action;
  try {
    action = await MatchAction.create({
      customer: req.customer._id,
      profile: pair.profile._id,
      matchmaker: req.user.id,
      score: pair.match.score,
      tier: pair.match.tier.label,
      profileSnapshot: {
        fullName: profile.fullName, age: profile.age, city: profile.city, designation: profile.designation,
      },
      sentTo: req.customer.email,
      subject: email.subject,
      body: email.text,
    });
  } catch (err) {
    if (err?.code === 11000) throw new AppError(409, 'This match has already been sent to this customer', 'ALREADY_SENT');
    throw err;
  }

  try {
    const delivery = await sendEmail({ to: req.customer.email, subject: email.subject, text: email.text });
    action.provider = delivery.provider;
    action.messageId = delivery.messageId;
    await action.save();
  } catch (err) {
    // Delivery failed: release the reservation so the matchmaker can retry.
    await MatchAction.deleteOne({ _id: action._id });
    throw new AppError(502, 'Email could not be delivered. Please try again.', 'EMAIL_FAILED');
  }

  await Customer.updateOne(
    { _id: req.customer._id, status: { $in: PRE_MATCH_STATUSES } },
    { status: 'match_sent' },
  );

  res.status(201).json({ sent: serializeAction(action), email: { to: req.customer.email, ...email } });
});

const serializeAction = (a) => ({
  id: String(a._id),
  profileId: String(a.profile),
  score: a.score,
  tier: a.tier,
  profile: a.profileSnapshot,
  sentTo: a.sentTo,
  subject: a.subject,
  body: a.body,
  provider: a.provider,
  createdAt: a.createdAt,
});

export const listSent = asyncHandler(async (req, res) => {
  const actions = await MatchAction.find({ customer: req.customer._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ data: actions.map(serializeAction) });
});
