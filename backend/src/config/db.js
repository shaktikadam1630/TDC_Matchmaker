import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

/** Connects to MongoDB, retrying a few times so containers can start in any order. */
export async function connectDb({ retries = 5, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      logger.warn(`MongoDB connection failed (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export const isDbReady = () => mongoose.connection.readyState === 1;

export const disconnectDb = () => mongoose.disconnect();
