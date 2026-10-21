import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Matchmaker } from '../models/Matchmaker.js';
import { signToken } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(40),
  password: z.string().min(1, 'Password is required').max(128),
});

// A real hash so a missing user costs the same time as a wrong password (no user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await Matchmaker.findOne({ username: username.toLowerCase() }).select('+passwordHash');

  const valid = user ? await user.verifyPassword(password) : await bcrypt.compare(password, DUMMY_HASH).then(() => false);
  if (!valid) throw new AppError(401, 'Invalid username or password', 'INVALID_CREDENTIALS');

  res.json({
    token: signToken(user),
    user: { id: String(user._id), name: user.name, username: user.username, email: user.email },
  });
});

export const me = (req, res) => res.json({ user: req.user });
