/**
 * Natural-language search over matches ("doctor in Mumbai, vegetarian, above 20 LPA").
 * A question becomes a structured `filters` object. The LLM can produce the same shape
 * (see aiService.parseQuery); this offline parser is the fallback, so the feature always works.
 */
import { z } from 'zod';

export const filtersSchema = z.object({
  cities: z.array(z.string().max(40)).max(8).nullish(),
  abroad: z.boolean().nullish(),
  designationKeywords: z.array(z.string().max(40)).max(10).nullish(),
  diet: z.array(z.string().max(20)).max(5).nullish(),
  religion: z.string().max(20).nullish(),
  minIncome: z.number().min(0).max(10000).nullish(),
  maxIncome: z.number().min(0).max(10000).nullish(),
  minAge: z.number().int().min(18).max(80).nullish(),
  maxAge: z.number().int().min(18).max(80).nullish(),
  minHeight: z.number().min(120).max(230).nullish(),
  maxHeight: z.number().min(120).max(230).nullish(),
  wantKids: z.array(z.string().max(10)).max(3).nullish(),
  openToRelocate: z.array(z.string().max(10)).max(3).nullish(),
  verified: z.boolean().nullish(),
});

const CITY_ALIASES = {
  mumbai: 'Mumbai', bombay: 'Mumbai', delhi: 'Delhi', bengaluru: 'Bengaluru', bangalore: 'Bengaluru',
  hyderabad: 'Hyderabad', pune: 'Pune', chennai: 'Chennai', kolkata: 'Kolkata', ahmedabad: 'Ahmedabad',
  jaipur: 'Jaipur', kochi: 'Kochi', chandigarh: 'Chandigarh', gurugram: 'Gurugram', gurgaon: 'Gurugram',
  noida: 'Noida', dubai: 'Dubai', london: 'London', 'new york': 'New York', toronto: 'Toronto',
  sydney: 'Sydney', singapore: 'Singapore',
};

const PROFESSIONS = [
  [/\b(doctor|doctors|physician|surgeon|medical)\b/, ['doctor']],
  [/\b(engineer|engineers|software|developer|tech|it professional)\b/, ['software', 'engineer', 'data scientist', 'ux', 'product manager']],
  [/\b(lawyer|lawyers|advocate|legal)\b/, ['lawyer']],
  [/\b(ca|chartered accountant|banker|finance|investment)\b/, ['chartered', 'banker', 'investment']],
  [/\b(professor|teacher|lecturer|academic)\b/, ['professor']],
  [/\b(designer|designers)\b/, ['designer']],
  [/\b(architect|architects)\b/, ['architect']],
  [/\b(business|businessman|entrepreneur|founder|consultant|manager)\b/, ['business owner', 'consultant', 'manager']],
  [/\b(civil services|ias|government)\b/, ['civil services']],
];

const NUM = '(\\d+(?:\\.\\d+)?)';
const INCOME_UNIT = '\\s*(?:l\\b|lakh|lakhs|lpa)';
const MONEY = `(?:₹|rs\\.?\\s*)?${NUM}${INCOME_UNIT}`;

/** Removes the matched text so later regexes (e.g. age) don't re-read the same numbers. */
function take(q, re) {
  const m = q.match(re);
  return m ? { m, q: q.replace(m[0], ' ') } : { m: null, q };
}

export function parseQueryLocal(raw, customer) {
  let q = ` ${String(raw).toLowerCase().replace(/[,;]/g, ' ')} `;
  const f = {};
  let t;

  const cities = Object.entries(CITY_ALIASES).filter(([k]) => new RegExp(`\\b${k}\\b`).test(q)).map(([, v]) => v);
  if (/\b(same city|my city|nearby)\b/.test(q) && customer?.city) cities.push(customer.city);
  if (cities.length) f.cities = [...new Set(cities)];
  if (/\b(abroad|nri|overseas|outside india)\b/.test(q)) f.abroad = true;

  const kw = PROFESSIONS.filter(([re]) => re.test(q)).flatMap(([, k]) => k);
  if (kw.length) f.designationKeywords = [...new Set(kw)];

  if (/non[\s-]?veg/.test(q)) f.diet = ['non_vegetarian', 'eggetarian'];
  else if (/\bvegan\b/.test(q)) f.diet = ['vegan'];
  else if (/\b(vegetarian|veg|pure veg)\b/.test(q)) f.diet = ['vegetarian', 'jain', 'vegan'];

  const rel = q.match(/\b(hindu|muslim|christian|sikh|jain|buddhist)\b/);
  if (rel) f.religion = rel[1][0].toUpperCase() + rel[1].slice(1);

  // Income (needs an explicit lakh/LPA unit so "under 30" can be read as an age instead).
  t = take(q, new RegExp(`(?:above|over|more than|at least|minimum|min|earning|>=?)\\s*${MONEY}`));
  if (t.m) { f.minIncome = Number(t.m[1]); q = t.q; }
  t = take(q, new RegExp(`(?:below|under|less than|maximum|max|upto|up to|<=?)\\s*${MONEY}`));
  if (t.m) { f.maxIncome = Number(t.m[1]); q = t.q; }

  // Height: "taller than 170 cm", "above 5'6"
  const ftToCm = (ft, inch) => Math.round((Number(ft) * 12 + Number(inch || 0)) * 2.54);
  t = take(q, /(?:taller than|above|over|at least)\s*(\d{3})\s*cm/);
  if (t.m) { f.minHeight = Number(t.m[1]); q = t.q; }
  t = take(q, /(?:shorter than|below|under)\s*(\d{3})\s*cm/);
  if (t.m) { f.maxHeight = Number(t.m[1]); q = t.q; }
  t = take(q, /(?:taller than|above|over|at least)\s*(\d)\s*(?:'|’|ft|feet)\s*(\d{1,2})?/);
  if (t.m) { f.minHeight = ftToCm(t.m[1], t.m[2]); q = t.q; }
  t = take(q, /(?:shorter than|below|under)\s*(\d)\s*(?:'|’|ft|feet)\s*(\d{1,2})?/);
  if (t.m) { f.maxHeight = ftToCm(t.m[1], t.m[2]); q = t.q; }

  // Age
  t = take(q, /between\s+(\d{2})\s*(?:and|to|-)\s*(\d{2})/);
  if (!t.m) t = take(q, /\b(\d{2})\s*(?:-|to)\s*(\d{2})\s*(?:years|yrs|yo|y)?\b/);
  if (t.m) { f.minAge = Number(t.m[1]); f.maxAge = Number(t.m[2]); q = t.q; }
  t = take(q, /(?:under|below|younger than|less than|upto|up to)\s*(\d{2})\b/);
  if (t.m) { f.maxAge = Number(t.m[1]); q = t.q; }
  t = take(q, /(?:above|over|older than|at least|more than)\s*(\d{2})\b/);
  if (t.m) { f.minAge = Number(t.m[1]); q = t.q; }

  if (/\b(wants? kids|wants? children|open to kids)\b/.test(q)) f.wantKids = ['yes', 'maybe'];
  if (/\b(no kids|child[\s-]?free|doesn'?t want kids)\b/.test(q)) f.wantKids = ['no', 'maybe'];
  if (/\brelocat/.test(q)) f.openToRelocate = ['yes', 'maybe'];
  if (/\bverified\b/.test(q)) f.verified = true;

  return f;
}

/** Human-readable list of what was understood (shown to the matchmaker as chips). */
export function describeFilters(f) {
  const out = [];
  if (f.cities?.length) out.push(`City: ${f.cities.join(' / ')}`);
  if (f.abroad) out.push('Lives abroad');
  if (f.designationKeywords?.length) out.push(`Profession: ${f.designationKeywords.slice(0, 3).join(' / ')}`);
  if (f.diet?.length) out.push(`Diet: ${f.diet.join(' / ').replace(/_/g, ' ')}`);
  if (f.religion) out.push(`Religion: ${f.religion}`);
  if (f.minIncome != null) out.push(`Income ≥ ₹${f.minIncome} LPA`);
  if (f.maxIncome != null) out.push(`Income ≤ ₹${f.maxIncome} LPA`);
  if (f.minAge != null) out.push(`Age ≥ ${f.minAge}`);
  if (f.maxAge != null) out.push(`Age ≤ ${f.maxAge}`);
  if (f.minHeight != null) out.push(`Height ≥ ${f.minHeight} cm`);
  if (f.maxHeight != null) out.push(`Height ≤ ${f.maxHeight} cm`);
  if (f.wantKids?.length) out.push(`Kids: ${f.wantKids.join(' / ')}`);
  if (f.openToRelocate?.length) out.push('Open to relocate');
  if (f.verified) out.push('Verified only');
  return out;
}

const lc = (v) => String(v ?? '').toLowerCase();

/** Builds a predicate over serialized pool profiles. Missing data never matches a requested filter. */
export function buildPredicate(f) {
  return (p) => {
    if (f.cities?.length && !f.cities.some((c) => lc(c) === lc(p.city))) return false;
    if (f.abroad && lc(p.country) === 'india') return false;
    if (f.designationKeywords?.length && !f.designationKeywords.some((k) => lc(p.designation).includes(lc(k)))) return false;
    if (f.diet?.length && !f.diet.includes(p.diet)) return false;
    if (f.religion && lc(p.religion) !== lc(f.religion)) return false;
    if (f.minIncome != null && !(p.incomeLpa >= f.minIncome)) return false;
    if (f.maxIncome != null && !(p.incomeLpa <= f.maxIncome)) return false;
    if (f.minAge != null && !(p.age >= f.minAge)) return false;
    if (f.maxAge != null && !(p.age <= f.maxAge)) return false;
    if (f.minHeight != null && !(p.heightCm >= f.minHeight)) return false;
    if (f.maxHeight != null && !(p.heightCm <= f.maxHeight)) return false;
    if (f.wantKids?.length && !f.wantKids.includes(p.wantKids)) return false;
    if (f.openToRelocate?.length && !f.openToRelocate.includes(p.openToRelocate)) return false;
    if (f.verified && !p.verified) return false;
    return true;
  };
}
