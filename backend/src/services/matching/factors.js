/**
 * Pure scoring functions, one per compatibility factor.
 *
 * Contract: each takes (customer, candidate, now) and returns
 *   { score: 0..1 | null, note: string, violation?: boolean, blocked?: boolean }
 *  - score null  -> data missing on either side; the engine ignores the factor and lowers confidence
 *  - violation   -> breaks a gender-specific preference rule (small penalty applied by the engine)
 *  - blocked     -> deal-breaker; candidate is excluded entirely
 *  - cap         -> soft ceiling on the final 0-100 score (a serious mismatch that is not a hard no)
 */
import { calcAge } from '../../utils/dates.js';
import { INTERFAITH_CAP } from './constants.js';

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const norm = (v) => String(v ?? '').trim().toLowerCase();
const same = (a, b) => norm(a) !== '' && norm(a) === norm(b);
const has = (v) => v !== undefined && v !== null && v !== '';
const ok = (score, note, extra = {}) => ({ score: clamp(score), note, ...extra });
const unknown = (note) => ({ score: null, note });

// ---------- Age ----------
export function ageFactor(c, p, now) {
  const ca = calcAge(c.dob, now);
  const pa = calcAge(p.dob, now);
  if (ca == null || pa == null) return unknown('Age not available');
  const gap = ca - pa; // > 0: candidate is younger than the customer

  if (c.gender === 'male') {
    // Brief: partner must be younger. Sweet spot is 2-5 years.
    if (gap < 0) return ok(0, `${-gap}y older than ${c.firstName}`, { violation: true });
    if (gap === 0) return ok(0.3, 'Same age (prefers a younger partner)', { violation: true });
    if (gap === 1) return ok(0.85, '1y younger');
    if (gap <= 5) return ok(1, `${gap}y younger - ideal gap`);
    return ok(Math.max(0.2, 1 - (gap - 5) * 0.12), `${gap}y younger - larger gap`);
  }
  // Female customer: partner usually a little older (sweet spot 2-6 years); younger is penalised.
  const older = -gap;
  if (older >= 2 && older <= 6) return ok(1, `${older}y older - ideal gap`);
  if (older >= 0 && older < 2) return ok(0.8, older === 0 ? 'Same age' : '1y older');
  if (older > 6 && older <= 10) return ok(1 - (older - 6) * 0.15, `${older}y older`);
  if (older > 10) return ok(0.2, `${older}y older - large gap`);
  return older >= -2
    ? ok(0.4, `${-older}y younger`)
    : ok(0.1, `${-older}y younger`, { violation: true });
}

// ---------- Income ----------
export function incomeFactor(c, p) {
  if (!has(c.incomeLpa) || !has(p.incomeLpa)) return unknown('Income not available for both');
  if (c.incomeLpa === 0) return ok(1, 'Income comparison not applicable');
  const ratio = p.incomeLpa / c.incomeLpa; // candidate / customer
  const note = `Earns ₹${p.incomeLpa} LPA vs ₹${c.incomeLpa} LPA`;

  if (c.gender === 'male') {
    // Brief: partner should earn less.
    if (ratio <= 0.9) return ok(1, `${note} (earns less)`);
    if (ratio <= 1.1) return ok(0.5, `${note} (about equal)`, { violation: true });
    return ok(0, `${note} (earns more)`, { violation: true });
  }
  // Female customer: financial stability matters more than "who earns more".
  if (ratio >= 1) return ok(1, `${note} (comparable or higher)`);
  if (ratio >= 0.7) return ok(0.7, `${note} (slightly lower)`);
  return ok((ratio / 0.7) * 0.6, `${note} (notably lower)`);
}

// ---------- Height ----------
export function heightFactor(c, p) {
  if (!has(c.heightCm) || !has(p.heightCm)) return unknown('Height not available for both');
  if (c.gender === 'male') {
    const diff = c.heightCm - p.heightCm; // > 0: she is shorter
    if (diff <= 0) return ok(0, `${p.heightCm}cm - not shorter`, { violation: true });
    if (diff < 8) return ok(0.7, `${diff}cm shorter`);
    if (diff <= 25) return ok(1, `${diff}cm shorter - ideal`);
    return ok(0.8, `${diff}cm shorter`);
  }
  const diff = p.heightCm - c.heightCm; // > 0: he is taller
  if (diff >= 5) return ok(1, `${diff}cm taller`);
  if (diff >= 0) return ok(0.7, diff === 0 ? 'Same height' : `${diff}cm taller`);
  return ok(0.2, `${-diff}cm shorter`, { violation: true });
}

// ---------- Kids (deal-breaker) ----------
const KIDS = {
  yes: { yes: 1, maybe: 0.65 },
  no: { no: 1, maybe: 0.5 },
  maybe: { yes: 0.65, no: 0.5, maybe: 0.8 },
};

export function kidsFactor(c, p) {
  if (!c.wantKids || !p.wantKids) return unknown('Views on children not stated for both');
  if (c.wantKids !== 'maybe' && p.wantKids !== 'maybe' && c.wantKids !== p.wantKids) {
    return { score: 0, blocked: true, note: 'Opposite views on having children' };
  }
  const s = KIDS[c.wantKids][p.wantKids];
  if (s === 1) return ok(1, c.wantKids === 'yes' ? 'Both want kids' : 'Neither wants kids');
  return ok(s, `Kids: ${c.wantKids} vs ${p.wantKids}`);
}

// ---------- Religion & community ----------
export function religionFactor(c, p) {
  if (!c.religion || !p.religion) return unknown('Religion not stated');
  if (same(c.religion, p.religion)) return ok(1, `Both ${c.religion}`);
  if (c.preferences?.religionStrict) return { score: 0, blocked: true, note: `Prefers ${c.religion} partner only` };
  // Soft mismatch: one bad factor must not be averaged away by twelve good ones, so cap the final score
  // below the "High Potential" tier (see INTERFAITH_CAP in constants.js).
  return ok(0.1, `${c.religion} vs ${p.religion}`, { cap: INTERFAITH_CAP });
}

export function casteFactor(c, p) {
  // Community only means something within the same religion.
  if (!same(c.religion, p.religion)) return unknown('Community not comparable across religions');
  if (!c.caste || !p.caste) return unknown('Community not stated');
  if (same(c.caste, p.caste)) return ok(1, `Same community (${c.caste})`);
  if (c.preferences?.casteStrict) return { score: 0, blocked: true, note: `Prefers ${c.caste} partner only` };
  return ok(0.4, `${c.caste} vs ${p.caste}`);
}

// ---------- Location & relocation ----------
export function locationFactor(c, p) {
  if (!c.city || !p.city) return unknown('Location not available');
  if (same(c.city, p.city) && same(c.country, p.country)) return ok(1, `Both in ${c.city}`);
  if (same(c.country, p.country)) return ok(0.55, `${c.city} vs ${p.city} (same country)`);
  return ok(0.2, `${c.city}, ${c.country} vs ${p.city}, ${p.country}`);
}

const OPENNESS = { yes: 1, maybe: 0.6, no: 0 };

export function relocationFactor(c, p) {
  if (same(c.city, p.city) && same(c.country, p.country)) return ok(1, 'Same city - no relocation needed');
  if (!c.openToRelocate || !p.openToRelocate) return unknown('Relocation preference not stated for both');

  const sameCountry = same(c.country, p.country);
  const a = OPENNESS[c.openToRelocate];
  const b = OPENNESS[p.openToRelocate];
  const best = Math.max(a, b);
  const worst = Math.min(a, b);

  if (best === 0) {
    // Neither will move and they live apart: a real blocker across countries, near-blocker otherwise.
    return sameCountry
      ? ok(0.15, 'Neither open to relocating (different cities)')
      : { score: 0, blocked: true, note: 'Neither open to relocating (different countries)' };
  }
  const base = 0.35 + 0.65 * best * (0.5 + 0.5 * worst);
  const score = sameCountry ? base : base * 0.85;
  const who = a >= b ? c.firstName : p.firstName;
  return ok(score, best === 1 && worst === 1 ? 'Both open to relocating' : `${who} is open to relocating`);
}

// ---------- Language ----------
export function languageFactor(c, p) {
  if (same(c.motherTongue, p.motherTongue)) return ok(1, `Share mother tongue (${c.motherTongue})`);
  const a = new Set((c.languages ?? []).map(norm));
  const shared = (p.languages ?? []).filter((l) => a.has(norm(l)));
  if (!a.size || !(p.languages ?? []).length) return unknown('Languages not stated');
  if (!shared.length) return ok(0.2, 'No common language listed');
  return ok(0.6 + 0.15 * Math.min(shared.length, 3), `Common: ${shared.slice(0, 3).join(', ')}`);
}

// ---------- Education ----------
export function educationLevel(degree) {
  const d = norm(degree);
  if (!d) return null;
  if (/ph\.?d|doctor|\bmd\b|\bdm\b|\bms\b ?\(surg/.test(d)) return 4;
  if (/m\.?b\.?a|m\.?tech|m\.?e\b|m\.?s\b|m\.?sc|m\.?com|m\.?a\b|llm|master|\bca\b|mch/.test(d)) return 3;
  if (/mbbs|b\.?tech|b\.?e\b|b\.?com|b\.?sc|b\.?a\b|bba|bca|llb|b\.?arch|bds|bachelor/.test(d)) return 2;
  return 1;
}

export function educationFactor(c, p) {
  const a = educationLevel(c.degree);
  const b = educationLevel(p.degree);
  if (a == null || b == null) return unknown('Education not available for both');
  const diff = Math.abs(a - b);
  return ok(1 - 0.3 * diff, diff === 0 ? `Similar education (${c.degree} / ${p.degree})` : `${c.degree} vs ${p.degree}`);
}

// ---------- Lifestyle (diet, smoking, drinking, pets) ----------
const DIET_PAIRS = {
  'eggetarian|non_vegetarian': 0.9, 'eggetarian|vegetarian': 0.55, 'jain|vegetarian': 0.85,
  'vegan|vegetarian': 0.8, 'jain|vegan': 0.8, 'non_vegetarian|vegetarian': 0.2,
  'jain|non_vegetarian': 0.1, 'non_vegetarian|vegan': 0.15, 'eggetarian|jain': 0.35, 'eggetarian|vegan': 0.4,
};
const dietScore = (a, b) => (a === b ? 1 : (DIET_PAIRS[[a, b].sort().join('|')] ?? 0.5));

const HABIT_LEVEL = { never: 0, occasionally: 1, regularly: 2 };
const habitScore = (a, b) => [1, 0.6, 0.15][Math.abs(HABIT_LEVEL[a] - HABIT_LEVEL[b])];

const PETS = { yes: { yes: 1, maybe: 0.8, no: 0.25 }, maybe: { yes: 0.8, maybe: 0.9, no: 0.6 }, no: { yes: 0.25, maybe: 0.6, no: 1 } };

export function lifestyleFactor(c, p) {
  const parts = [];
  const mismatches = [];
  const add = (label, a, b, fn) => {
    if (!a || !b) return;
    const s = fn(a, b);
    parts.push(s);
    if (s < 0.5) mismatches.push(label);
  };
  add('diet', c.diet, p.diet, dietScore);
  add('smoking', c.smoking, p.smoking, habitScore);
  add('drinking', c.drinking, p.drinking, habitScore);
  add('pets', c.openToPets, p.openToPets, (a, b) => PETS[a][b]);

  if (!parts.length) return unknown('Lifestyle details not available');
  const score = parts.reduce((s, n) => s + n, 0) / parts.length;
  return ok(score, mismatches.length ? `Differences in ${mismatches.join(', ')}` : 'Aligned lifestyle (diet, habits, pets)');
}

// ---------- Family values ----------
const VALUE_IDX = { traditional: 0, moderate: 1, liberal: 2 };

export function familyFactor(c, p) {
  const parts = [];
  if (c.familyValues && p.familyValues) {
    parts.push([1, 0.65, 0.2][Math.abs(VALUE_IDX[c.familyValues] - VALUE_IDX[p.familyValues])]);
  }
  if (c.familyType && p.familyType) parts.push(c.familyType === p.familyType ? 1 : 0.55);
  if (!parts.length) return unknown('Family details not available');
  const score = parts.reduce((s, n) => s + n, 0) / parts.length;
  const note =
    c.familyValues && p.familyValues
      ? c.familyValues === p.familyValues
        ? `Both ${c.familyValues} family values`
        : `${c.familyValues} vs ${p.familyValues} family values`
      : `Family type: ${c.familyType} vs ${p.familyType}`;
  return ok(score, note);
}

// ---------- Profession ----------
const DOMAIN_RULES = [
  ['medical', /doctor|physician|surgeon|dentist|pharmac|nurse|medical|radiolog/],
  ['legal', /lawyer|advocate|legal|counsel/],
  ['education', /professor|teacher|lecturer|researcher/],
  ['government', /\bias\b|\bips\b|civil serv|government|defen[cs]e|army|navy|air force/],
  ['creative', /designer|artist|writer|journalist|film|content|architect/],
  ['tech', /software|developer|data |devops|ml |product manager|\bqa\b|\bux\b|\bsde\b|engineer/],
  ['finance', /bank|financ|chartered|\bca\b|analyst|investment|auditor|accountant|actuar/],
  ['business', /founder|entrepreneur|business|owner|manager|consultant|marketing|sales/],
];
const RELATED = new Set([
  'tech|finance', 'tech|business', 'finance|business', 'medical|education',
  'legal|government', 'creative|business', 'education|government', 'creative|tech',
]);

export function professionDomain(designation) {
  const d = norm(designation);
  if (!d) return null;
  return DOMAIN_RULES.find(([, re]) => re.test(d))?.[0] ?? 'other';
}

export function professionFactor(c, p) {
  const a = professionDomain(c.designation);
  const b = professionDomain(p.designation);
  if (!a || !b) return unknown('Profession not available for both');
  if (a === b && a !== 'other') return ok(1, `Both in ${a} - similar work rhythm`);
  if (RELATED.has([a, b].sort().join('|'))) return ok(0.7, `${a} and ${b} are complementary fields`);
  return ok(0.5, `${p.designation} vs ${c.designation}`);
}

export const FACTOR_FNS = {
  age: ageFactor,
  income: incomeFactor,
  height: heightFactor,
  kids: kidsFactor,
  religion: religionFactor,
  caste: casteFactor,
  location: locationFactor,
  relocation: relocationFactor,
  language: languageFactor,
  education: educationFactor,
  lifestyle: lifestyleFactor,
  family: familyFactor,
  profession: professionFactor,
};
