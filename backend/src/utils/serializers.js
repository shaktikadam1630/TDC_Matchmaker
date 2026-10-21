import { calcAge } from './dates.js';

const plain = (doc) => (typeof doc.toObject === 'function' ? doc.toObject() : { ...doc });

/** Full customer record as seen by the owning matchmaker. */
export function serializeCustomer(doc) {
  const { _id, __v, matchmaker, notes = [], ...rest } = plain(doc);
  return {
    ...rest,
    id: String(_id),
    matchmaker: String(matchmaker),
    fullName: `${rest.firstName} ${rest.lastName}`,
    age: calcAge(rest.dob),
    notes: notes
      .map(({ _id: nid, ...n }) => ({ ...n, id: String(nid) }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };
}

/** Compact row for the dashboard list. */
export function serializeCustomerRow(doc) {
  const c = serializeCustomer(doc);
  return {
    id: c.id,
    fullName: c.fullName,
    gender: c.gender,
    age: c.age,
    city: c.city,
    country: c.country,
    maritalStatus: c.maritalStatus,
    status: c.status,
    verified: c.verified,
    updatedAt: c.updatedAt,
  };
}

/**
 * Pool profile shown on match cards. Contact details and exact DOB are deliberately
 * omitted - those are shared only after both sides consent.
 */
export function serializePoolProfile(doc) {
  const { _id, __v, email, phone, dob, active, createdAt, updatedAt, ...rest } = plain(doc);
  return { ...rest, id: String(_id), fullName: `${rest.firstName} ${rest.lastName}`, age: calcAge(dob) };
}
