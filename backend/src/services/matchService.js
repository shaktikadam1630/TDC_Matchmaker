/**
 * Orchestrates matching: retrieve candidates (Mongo) -> score/rank (engine) -> optional AI enrichment.
 * Retrieval is a cheap indexed pre-filter; the expensive work only runs on survivors, and the
 * LLM only ever sees the top-N, so cost stays flat as the pool grows.
 */
import { Profile } from '../models/Profile.js';
import { MatchAction } from '../models/MatchAction.js';
import { AppError } from '../utils/AppError.js';
import { calcAge, yearsAgo } from '../utils/dates.js';
import { serializePoolProfile } from '../utils/serializers.js';
import { allowedMaritalStatuses, oppositeGender, rankCandidates, scoreCandidate } from './matching/engine.js';
import { applyAdjustment, ruleInsight } from './matching/insights.js';
import { listWords, sharedInterests } from './matching/interests.js';
import { generateMatchInsights, isAiEnabled } from './ai/aiService.js';
import { tierFor } from './matching/constants.js';

export const AI_TOP_N = 10; // never send more than this to the LLM
const INTEREST_BONUS_PER = 2; // points per shared interest...
const INTEREST_BONUS_MAX = 4; // ...capped, and never above the pair's own ceiling

function assertMatchable(customer) {
  if (customer.maritalStatus === 'awaiting_divorce') {
    throw new AppError(422, 'Matching is paused until the divorce is finalised.', 'MATCHING_PAUSED');
  }
}

/** Cheap indexed query: gender, status, explicit age window and religion. */
function buildCandidateQuery(customer, { verifiedOnly = false } = {}, now = new Date()) {
  const q = {
    active: true,
    gender: oppositeGender(customer.gender),
    maritalStatus: { $in: allowedMaritalStatuses(customer) },
  };
  const { ageMin, ageMax, religionStrict } = customer.preferences ?? {};
  const dob = {};
  if (ageMin) dob.$lte = yearsAgo(ageMin, now);
  if (ageMax) dob.$gt = yearsAgo(ageMax + 1, now);
  if (Object.keys(dob).length) q.dob = dob;
  if (religionStrict && customer.religion) q.religion = customer.religion;
  if (verifiedOnly) q.verified = true;
  return q;
}

/** Turns an engine result into an API match: adds the shared-interests bonus and a rule-based insight. */
const toMatch = (r, sentIds, customer) => {
  const profile = serializePoolProfile(r.candidate);
  const shared = sharedInterests(customer.bio, r.candidate.bio);
  const bonus = Math.min(INTEREST_BONUS_MAX, shared.length * INTEREST_BONUS_PER);
  const score = Math.min(r.cap ?? 100, r.score + bonus);

  const breakdown = [
    ...r.breakdown,
    {
      key: 'interests', label: 'Shared interests', weight: 0, bonus,
      score: shared.length ? Math.min(1, shared.length / 2) : null,
      note: shared.length ? `Both enjoy ${listWords(shared)} (+${bonus} bonus)` : 'No shared interests listed',
    },
  ];
  const match = {
    profile, score, tier: tierFor(score), confidence: r.confidence, violations: r.violations,
    breakdown, alreadySent: sentIds.has(profile.id),
  };
  const insight = ruleInsight(match);
  if (shared.length) {
    insight.talkingPoints = [`You both enjoy ${listWords(shared)}`, ...insight.talkingPoints].slice(0, 3);
    insight.rationale += ` They also share an interest in ${listWords(shared)}.`;
  }
  return { ...match, insight };
};

/**
 * @param customer lean customer document
 * @param opts { limit, minScore, ai, verifiedOnly, predicate }  predicate filters serialized profiles
 */
export async function findMatches(customer, { limit = 10, minScore = 0, ai = false, verifiedOnly = false, predicate = null } = {}) {
  assertMatchable(customer);

  const [candidates, sent] = await Promise.all([
    Profile.find(buildCandidateQuery(customer, { verifiedOnly })).lean(),
    MatchAction.find({ customer: customer._id }).select('profile').lean(),
  ]);
  const sentIds = new Set(sent.map((s) => String(s.profile)));

  const { ranked, blocked } = rankCandidates(customer, candidates);
  // The interests bonus can reorder neighbours, so score everyone before cutting to `limit`.
  const eligible = ranked
    .map((r) => toMatch(r, sentIds, customer))
    .filter((m) => m.score >= minScore && (!predicate || predicate(m.profile)))
    .sort((a, b) => b.score - a.score);
  let matches = eligible.slice(0, limit);

  let aiSource = 'none';
  if (ai && isAiEnabled() && matches.length) {
    const top = matches.slice(0, AI_TOP_N);
    const insights = await generateMatchInsights(
      { ...customer, age: calcAge(customer.dob) },
      top,
      String(customer.updatedAt?.getTime?.() ?? ''),
    );
    aiSource = insights.size ? 'openai' : 'rules';
    matches = matches
      .map((m) => {
        const i = insights.get(m.profile.id);
        return i ? { ...applyAdjustment(m, i.adjustment), insight: i } : m;
      })
      .sort((a, b) => b.score - a.score);
  }

  const best = matches.find((m) => !m.alreadySent);
  return {
    matches,
    meta: {
      pool: candidates.length,
      excludedByDealBreakers: blocked,
      eligible: eligible.length,
      returned: matches.length,
      aiEnabled: isAiEnabled(),
      aiSource,
      // "Suggested next step": the strongest match that hasn't been sent yet.
      topPick: best
        ? {
            profileId: best.profile.id,
            text: `Start with ${best.profile.firstName} (${best.score}/100). ${best.insight.rationale}`,
            watchOut: best.insight.watchOut ?? null,
            source: best.insight.source,
          }
        : null,
    },
  };
}

/** Scores a single pool profile for a customer (used when drafting / sending an intro). */
export async function evaluatePair(customer, profileId) {
  assertMatchable(customer);
  const profile = await Profile.findOne({ _id: profileId, active: true }).lean();
  if (!profile) return null;
  const r = scoreCandidate(customer, profile);
  if (r.blocked) throw new AppError(422, `Not an eligible match: ${r.blocked}`, 'NOT_ELIGIBLE');
  return { profile, match: { ...r, tier: tierFor(r.score) } };
}
