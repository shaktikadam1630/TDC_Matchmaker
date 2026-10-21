/**
 * Matching configuration. Weights are per *customer* gender: the same factor matters
 * differently depending on whose perspective we score from (see docs/MATCHING_LOGIC.md).
 * Each row must sum to 1.0 (enforced by a unit test).
 */
export const WEIGHTS = {
  // Male customer: the brief asks for younger / lower-earning / shorter partner + same view on kids.
  male: {
    age: 0.14, income: 0.08, height: 0.07, kids: 0.14,
    religion: 0.10, caste: 0.05, location: 0.08, relocation: 0.06,
    language: 0.05, education: 0.05, lifestyle: 0.10, family: 0.04, profession: 0.04,
  },
  // Female customer: weight shifts to profession, values (family/religion), relocation, lifestyle.
  female: {
    age: 0.08, income: 0.06, height: 0.04, kids: 0.14,
    religion: 0.10, caste: 0.05, location: 0.06, relocation: 0.10,
    language: 0.04, education: 0.06, lifestyle: 0.07, family: 0.10, profession: 0.10,
  },
};

export const FACTOR_LABELS = {
  age: 'Age',
  income: 'Income',
  height: 'Height',
  kids: 'Views on kids',
  religion: 'Religion',
  caste: 'Community',
  location: 'Location',
  relocation: 'Relocation',
  language: 'Language',
  education: 'Education',
  lifestyle: 'Lifestyle',
  family: 'Family values',
  profession: 'Profession',
};

/** Highest threshold first. */
export const TIERS = [
  { min: 78, key: 'high', label: 'High Potential Match' },
  { min: 62, key: 'good', label: 'Good Match' },
  { min: 45, key: 'fair', label: 'Worth Exploring' },
  { min: 0, key: 'low', label: 'Low Compatibility' },
];

export const tierFor = (score) => TIERS.find((t) => score >= t.min);

/** Religion mismatch (when not a strict preference) can never score above this: keeps it out of "High Potential". */
export const INTERFAITH_CAP = 68;

/** Each violated gender rule (e.g. "she should be younger") shaves this off the final score, capped. */
export const VIOLATION_PENALTY = 0.08;
export const MAX_VIOLATION_PENALTY = 0.3;
