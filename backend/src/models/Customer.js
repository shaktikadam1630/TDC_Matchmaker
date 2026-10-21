import mongoose from 'mongoose';
import { profileFields } from './profileFields.js';

export const CUSTOMER_STATUSES = [
  'onboarding',
  'verified',
  'searching',
  'match_sent',
  'in_conversation',
  'engaged',
  'on_hold',
];

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: String, trim: true, maxlength: 80 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const customerSchema = new mongoose.Schema(
  {
    ...profileFields,
    matchmaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Matchmaker', required: true, index: true },
    status: { type: String, enum: CUSTOMER_STATUSES, default: 'onboarding' },
    notes: { type: [noteSchema], default: [] },
    // Explicit partner preferences. Anything set here acts as a hard filter in matching.
    preferences: {
      ageMin: { type: Number, min: 18, max: 80 },
      ageMax: { type: Number, min: 18, max: 80 },
      religionStrict: { type: Boolean, default: false },
      casteStrict: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

customerSchema.index({ matchmaker: 1, status: 1, updatedAt: -1 });
customerSchema.index({ matchmaker: 1, firstName: 1, lastName: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
