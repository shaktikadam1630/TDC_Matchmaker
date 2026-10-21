import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = '';

const { WEIGHTS } = await import('../src/services/matching/constants.js');
const { scoreCandidate, rankCandidates } = await import('../src/services/matching/engine.js');
const { generatePool } = await import('../src/seed/generator.js');
const { generateIntro } = await import('../src/services/ai/aiService.js');

const NOW = new Date('2026-01-01');
const dob = (age) => new Date(NOW.getFullYear() - age, 5, 15);

const man = {
  firstName: 'Arjun', gender: 'male', dob: dob(30), heightCm: 178, incomeLpa: 30, city: 'Mumbai', country: 'India',
  religion: 'Hindu', caste: 'Brahmin', maritalStatus: 'never_married', wantKids: 'yes', openToRelocate: 'maybe',
  designation: 'Software Engineer', degree: 'B.Tech', languages: ['Hindi', 'English'], diet: 'vegetarian',
};
const woman = (over = {}) => ({
  firstName: 'Meera', gender: 'female', dob: dob(27), heightCm: 163, incomeLpa: 20, city: 'Mumbai', country: 'India',
  religion: 'Hindu', caste: 'Brahmin', maritalStatus: 'never_married', wantKids: 'yes', openToRelocate: 'yes',
  designation: 'Product Manager', degree: 'MBA', languages: ['Hindi', 'English'], diet: 'vegetarian', ...over,
});

test('weights sum to 1 for both genders', () => {
  for (const g of ['male', 'female']) {
    const sum = Object.values(WEIGHTS[g]).reduce((s, n) => s + n, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${g} weights sum to ${sum}`);
  }
});

test('male customer: younger, shorter, lower-earning partner outscores the opposite', () => {
  const ideal = scoreCandidate(man, woman(), NOW);
  const inverse = scoreCandidate(man, woman({ dob: dob(34), heightCm: 182, incomeLpa: 45 }), NOW);
  assert.ok(ideal.score > inverse.score + 15, `${ideal.score} vs ${inverse.score}`);
  assert.equal(inverse.violations, 3);
  assert.equal(ideal.violations, 0);
});

test('opposite views on kids is a deal-breaker', () => {
  assert.ok(scoreCandidate(man, woman({ wantKids: 'no' }), NOW).blocked);
  assert.ok(!scoreCandidate(man, woman({ wantKids: 'maybe' }), NOW).blocked);
});

test('female customer prefers a slightly older, taller partner', () => {
  const her = woman({ incomeLpa: 20 });
  const good = scoreCandidate(her, { ...man, dob: dob(30), heightCm: 178 }, NOW);
  const worse = scoreCandidate(her, { ...man, dob: dob(22), heightCm: 160 }, NOW);
  assert.ok(good.score > worse.score);
});

test('missing data is skipped, lowers confidence, and never crashes', () => {
  const sparse = woman({ incomeLpa: undefined, heightCm: undefined, wantKids: undefined, diet: undefined });
  const r = scoreCandidate(man, sparse, NOW);
  assert.ok(r.confidence < 1);
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('strict religion preference blocks other religions; age preference is honoured', () => {
  const strict = { ...man, preferences: { religionStrict: true } };
  assert.ok(scoreCandidate(strict, woman({ religion: 'Muslim' }), NOW).blocked);
  const aged = { ...man, preferences: { ageMin: 20, ageMax: 25 } };
  assert.ok(scoreCandidate(aged, woman(), NOW).blocked); // she is 27
});

test('interfaith pairs are capped below High Potential; same-religion pairs can reach it', () => {
  const interfaith = scoreCandidate(man, woman({ religion: 'Muslim', caste: 'Sunni' }), NOW);
  assert.ok(interfaith.score <= 68, `interfaith scored ${interfaith.score}`);
  assert.notEqual(interfaith.tier.key, 'high');
  assert.equal(scoreCandidate(man, woman(), NOW).tier.key, 'high');
});

test('never-married customers only match never-married candidates', () => {
  assert.ok(scoreCandidate(man, woman({ maritalStatus: 'divorced' }), NOW).blocked);
  assert.ok(!scoreCandidate({ ...man, maritalStatus: 'divorced' }, woman({ maritalStatus: 'never_married' }), NOW).blocked);
  assert.ok(scoreCandidate({ ...man, maritalStatus: 'divorced' }, woman({ maritalStatus: 'awaiting_divorce' }), NOW).blocked);
});

test('both unwilling to relocate across countries is blocked', () => {
  const abroad = woman({ city: 'London', country: 'UK', openToRelocate: 'no' });
  assert.ok(scoreCandidate({ ...man, openToRelocate: 'no' }, abroad, NOW).blocked);
});

test('ranking a seeded pool is sorted, bounded and covers 100+ opposite-gender profiles', () => {
  const pool = generatePool(120).map((p, i) => ({ ...p, _id: String(i) }));
  assert.ok(pool.filter((p) => p.gender === 'female').length >= 100);
  const { ranked } = rankCandidates(man, pool.filter((p) => p.gender === 'female'), NOW);
  assert.ok(ranked.length > 0);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].score >= ranked[i].score);
  assert.ok(ranked.every((r) => r.score >= 0 && r.score <= 100));
});

test('intro generation falls back to a template without an API key', async () => {
  const draft = await generateIntro({ firstName: 'Arjun' }, { firstName: 'Meera', age: 27, city: 'Mumbai' }, null);
  assert.equal(draft.source, 'template');
  assert.match(draft.body, /Meera/);
});
