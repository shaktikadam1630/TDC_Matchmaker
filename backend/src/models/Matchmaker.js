import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const matchmakerSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

matchmakerSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

matchmakerSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 10);

export const Matchmaker = mongoose.model('Matchmaker', matchmakerSchema);
