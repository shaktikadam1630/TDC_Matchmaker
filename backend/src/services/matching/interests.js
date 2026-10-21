/**
 * Lightweight text similarity over free-text bios: extract known interests, then compare.
 * Deterministic and offline - this is the "similarity logic" part of the AI layer.
 */
const INTERESTS = [
  'trekking', 'classical music', 'cooking', 'reading', 'travelling', 'photography', 'yoga', 'cricket',
  'painting', 'badminton', 'baking', 'gardening', 'movies', 'dancing', 'music', 'fitness', 'hiking',
  'football', 'cycling', 'meditation', 'writing', 'gaming', 'volunteering',
];

export function extractInterests(bio) {
  const text = String(bio ?? '').toLowerCase();
  return INTERESTS.filter((i) => text.includes(i));
}

export function sharedInterests(bioA, bioB) {
  const b = new Set(extractInterests(bioB));
  return extractInterests(bioA).filter((i) => b.has(i));
}

export const listWords = (arr) =>
  arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
