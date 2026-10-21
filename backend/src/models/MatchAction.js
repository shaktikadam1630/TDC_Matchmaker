import mongoose from 'mongoose';

/** Audit record of a match being sent to a customer (one per customer/profile pair). */
const matchActionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    matchmaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Matchmaker', required: true },
    score: { type: Number, min: 0, max: 100 },
    tier: String,
    // Snapshot so history stays readable even if the pool profile changes later.
    profileSnapshot: {
      fullName: String,
      age: Number,
      city: String,
      designation: String,
    },
    sentTo: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    provider: { type: String, default: 'mock' },
    messageId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// DB-level guarantee against double sends, even under concurrent clicks.
matchActionSchema.index({ customer: 1, profile: 1 }, { unique: true });
matchActionSchema.index({ customer: 1, createdAt: -1 });

export const MatchAction = mongoose.model('MatchAction', matchActionSchema);
