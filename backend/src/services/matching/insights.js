import { tierFor } from './constants.js';

/**
 * Deterministic, explainable insight built from the factor breakdown.
 * Used as the default and as the fallback whenever the LLM is unavailable.
 */
export function ruleInsight(match) {
  const known = match.breakdown.filter((f) => f.score != null);
  const strengths = known
    .filter((f) => f.score >= 0.75)
    .sort((a, b) => b.weight * b.score - a.weight * a.score)
    .slice(0, 3);
  const concern = known
    .filter((f) => f.score < 0.45)
    .sort((a, b) => b.weight - a.weight)[0];

  const lead = strengths[0]?.label ?? 'Balanced overall fit';
  const headline = `${match.tier.label} - ${lead.toLowerCase() === 'balanced overall fit' ? lead : `strong on ${lead.toLowerCase()}`}`;
  const rationale = strengths.length
    ? strengths.map((f) => f.note).join('. ') + '.'
    : 'No standout strengths, but no deal-breakers either.';

  return {
    headline,
    rationale,
    talkingPoints: strengths.slice(0, 2).map((f) => f.note),
    watchOut: concern ? concern.note : match.confidence < 0.6 ? 'Limited data - verify details in a call.' : null,
    source: 'rules',
  };
}

/** Applies a bounded AI nudge and recomputes the tier. */
export function applyAdjustment(match, adjustment = 0) {
  const score = Math.max(0, Math.min(100, match.score + adjustment));
  return { ...match, score, tier: tierFor(score) };
}
