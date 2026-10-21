import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Matchmaker } from '../models/Matchmaker.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (matchmaker) =>
  jwt.sign({ sub: String(matchmaker._id) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

/** Verifies the Bearer token and confirms the matchmaker still exists. Sets req.user. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');

  const payload = jwt.verify(token, env.JWT_SECRET); // JsonWebTokenError handled centrally -> 401
  const user = await Matchmaker.findById(payload.sub).lean();
  if (!user) throw new AppError(401, 'Account no longer exists', 'UNAUTHENTICATED');

  req.user = { id: String(user._id), name: user.name, username: user.username, email: user.email };
  next();
});
