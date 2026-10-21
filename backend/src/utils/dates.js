/** Whole years between `dob` and `now`; null for missing/invalid dates. */
export function calcAge(dob, now = new Date()) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** The date `years` before `now` (used to turn an age range into a DOB range query). */
export function yearsAgo(years, now = new Date()) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d;
}
