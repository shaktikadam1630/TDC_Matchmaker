/**
 * Matching engine (pure, no I/O) - easy to unit test and to move into a worker later.
 *
 *  1. Hard filters   : explicit preferences and deal-breakers remove candidates outright.
 *  2. Factor scoring : 13 weighted 0..1 factors, weights depend on the customer's gender.
 *  3. Rule penalty   : each broken gender rule (e.g. "she should be younger") costs a few points.
 *  4. Confidence     : missing data is skipped, not guessed; the score is shrunk toward 50
 *                      in proportion to how much weight we could not evaluate.
 */
import { calcAge } from '../../utils/dates.js';
import { FACTOR_FNS } from './factors.js';
import {
  FACTOR_LABELS, MAX_VIOLATION_PENALTY, VIOLATION_PENALTY, WEIGHTS, tierFor,
} from './constants.js';

const NEUTRAL = 0.5;

/** Which marital statuses a customer is open to being matched with. */
export function allowedMaritalStatuses(customer) {
  return customer.maritalStatus === 'never_married'
    ? ['never_married']
    : ['never_married', 'divorced', 'widowed']; // previously married: open to all but "awaiting divorce"
}

export const oppositeGender = (g) => (g === 'male' ? 'female' : 'male');

/** Returns a reason string if the candidate is excluded by an explicit preference. */
function hardBlocker(customer, candidate, now) {
  const age = calcAge(candidate.dob, now);
  const { ageMin, ageMax } = customer.preferences ?? {};
  if (age != null && ageMin && age < ageMin) return `Younger than preferred minimum age (${ageMin})`;
  if (age != null && ageMax && age > ageMax) return `Older than preferred maximum age (${ageMax})`;
  if (candidate.gender === customer.gender) return 'Same gender';
  if (!allowedMaritalStatuses(customer).includes(candidate.maritalStatus)) return 'Marital status not compatible';
  return null;
}

/**
 * Scores one candidate against a customer.
 * @returns {{blocked: string} | {score, tier, confidence, violations, breakdown}}
 */
export function scoreCandidate(customer, candidate, now = new Date()) {
  const blockedReason = hardBlocker(customer, candidate, now);
  if (blockedReason) return { blocked: blockedReason };

  const weights = WEIGHTS[customer.gender];
  if (!weights) return { blocked: 'Unsupported customer gender' };

  const breakdown = [];
  let weighted = 0;
  let knownWeight = 0;
  let violations = 0;
  let cap = 100;

  for (const [key, weight] of Object.entries(weights)) {
    const r = FACTOR_FNS[key](customer, candidate, now);
    if (r.blocked) return { blocked: r.note };
    if (r.violation) violations++;
    if (r.cap) cap = Math.min(cap, r.cap);
    if (r.score != null) {
      weighted += weight * r.score;
      knownWeight += weight;
    }
    breakdown.push({
      key, label: FACTOR_LABELS[key], weight, score: r.score, note: r.note, violation: !!r.violation,
    });
  }

  const base = knownWeight > 0 ? weighted / knownWeight : NEUTRAL;
  const shrunk = base * knownWeight + NEUTRAL * (1 - knownWeight); // low data -> pulled to neutral
  const penalty = Math.min(MAX_VIOLATION_PENALTY, violations * VIOLATION_PENALTY);
  const score = Math.min(cap, Math.round(shrunk * (1 - penalty) * 100));

  return {
    score,
    tier: tierFor(score),
    confidence: Math.round(knownWeight * 100) / 100,
    cap, // lets later bonuses (shared interests) respect the same ceiling
    violations,
    breakdown,
  };
}

/**
 * Scores and ranks every candidate. Blocked ones are counted but not returned.
 * O(n) scoring + O(n log n) sort - fine for tens of thousands of pre-filtered rows.
 */
export function rankCandidates(customer, candidates, now = new Date()) {
  const ranked = [];
  let blocked = 0;
  for (const candidate of candidates) {
    const r = scoreCandidate(customer, candidate, now);
    if (r.blocked) blocked++;
    else ranked.push({ candidate, ...r });
  }
  ranked.sort((a, b) => b.score - a.score || b.confidence - a.confidence || String(a.candidate._id).localeCompare(String(b.candidate._id)));
  return { ranked, blocked };
}
