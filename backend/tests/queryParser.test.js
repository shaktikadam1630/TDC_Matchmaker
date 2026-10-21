import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parseQueryLocal, describeFilters, buildPredicate } = await import('../src/services/matching/queryParser.js');
const { sharedInterests } = await import('../src/services/matching/interests.js');

test('parses profession, city, diet and income together', () => {
  const f = parseQueryLocal('Doctor in Bangalore, vegetarian, above 20 LPA');
  assert.deepEqual(f.cities, ['Bengaluru']);
  assert.ok(f.designationKeywords.includes('doctor'));
  assert.ok(f.diet.includes('vegetarian'));
  assert.equal(f.minIncome, 20);
  assert.equal(f.minAge, undefined); // "20" belongs to income, not age
});

test('non-veg is not read as vegetarian; age and height ranges parse', () => {
  const f = parseQueryLocal('non veg, between 25 and 30, taller than 5\'6');
  assert.ok(f.diet.includes('non_vegetarian') && !f.diet.includes('vegetarian'));
  assert.equal(f.minAge, 25);
  assert.equal(f.maxAge, 30);
  assert.equal(f.minHeight, 168);
});

test('"under 30" is age, "under 30 lakh" is income', () => {
  assert.equal(parseQueryLocal('under 30').maxAge, 30);
  const f = parseQueryLocal('under 30 lakh');
  assert.equal(f.maxIncome, 30);
  assert.equal(f.maxAge, undefined);
});

test('gibberish yields nothing understood; predicate treats missing data as non-matching', () => {
  assert.equal(describeFilters(parseQueryLocal('asdf qwerty')).length, 0);
  const pred = buildPredicate({ minIncome: 20 });
  assert.equal(pred({ incomeLpa: 25 }), true);
  assert.equal(pred({ incomeLpa: undefined }), false);
});

test('shared interests are found from bios', () => {
  assert.deepEqual(sharedInterests('I enjoy yoga and cooking.', 'Loves Cooking, cricket'), ['cooking']);
  assert.deepEqual(sharedInterests('', null), []);
});
