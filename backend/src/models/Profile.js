import mongoose from 'mongoose';
import { profileFields } from './profileFields.js';

/** A member of the matching pool (the dummy profiles). */
const profileSchema = new mongoose.Schema(
  {
    ...profileFields,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Candidate retrieval filters on gender/active/marital status and an age (DOB) window.
profileSchema.index({ gender: 1, active: 1, maritalStatus: 1, dob: 1 });

export const Profile = mongoose.model('Profile', profileSchema);
