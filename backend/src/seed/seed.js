import { Matchmaker } from '../models/Matchmaker.js';
import { Customer } from '../models/Customer.js';
import { Profile } from '../models/Profile.js';
import { MatchAction } from '../models/MatchAction.js';
import { logger } from '../utils/logger.js';
import { generateCustomers, generatePool } from './generator.js';

export const DEMO_USERS = [
  { username: 'matchmaker1', password: 'Match@123', name: 'Asha Kapoor', email: 'asha@tdc.example.com', customers: 16 },
  { username: 'matchmaker2', password: 'Match@123', name: 'Rohit Menon', email: 'rohit@tdc.example.com', customers: 8 },
];

/** Seeds matchmakers, customers and 240 pool profiles (120 per gender). Optionally wipes first. */
export async function runSeed({ reset = false, perGender = 120 } = {}) {
  if (reset) {
    await Promise.all([Matchmaker.deleteMany({}), Customer.deleteMany({}), Profile.deleteMany({}), MatchAction.deleteMany({})]);
  }
  // Make sure unique indexes exist before bulk inserting.
  await Promise.all([Matchmaker.init(), Customer.init(), Profile.init(), MatchAction.init()]);

  await Profile.insertMany(generatePool(perGender), { ordered: false });

  for (const u of DEMO_USERS) {
    const mm = await Matchmaker.create({
      username: u.username, name: u.name, email: u.email, passwordHash: await Matchmaker.hashPassword(u.password),
    });
    await Customer.insertMany(generateCustomers(mm._id, u.customers));
  }
  logger.info(`Seeded ${perGender * 2} pool profiles, ${DEMO_USERS.length} matchmakers. Login: matchmaker1 / Match@123`);
}
