import { z } from 'zod';
import mongoose from 'mongoose';
import { Customer, CUSTOMER_STATUSES } from '../models/Customer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { serializeCustomer, serializeCustomerRow } from '../utils/serializers.js';

export const listQuery = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  verified: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const statusBody = z.object({ status: z.enum(CUSTOMER_STATUSES) });
export const noteBody = z.object({ text: z.string().trim().min(1, 'Note cannot be empty').max(1000) });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /customers - the signed-in matchmaker's customers, searchable and paginated. */
export const list = asyncHandler(async (req, res) => {
  const { q, status, verified, page, limit } = req.query;
  const filter = { matchmaker: req.user.id };
  if (status) filter.status = status;
  if (verified) filter.verified = verified === 'true';
  if (q) {
    // Escape user input: it is used inside a regex.
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { city: re }];
  }

  const [rows, total] = await Promise.all([
    Customer.find(filter)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('firstName lastName gender dob city country maritalStatus status verified updatedAt matchmaker')
      .lean(),
    Customer.countDocuments(filter),
  ]);

  res.json({
    data: rows.map(serializeCustomerRow),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

/** GET /customers/stats - counts per status for the filter chips. */
export const stats = asyncHandler(async (req, res) => {
  const agg = await Customer.aggregate([
    { $match: { matchmaker: new mongoose.Types.ObjectId(req.user.id) } }, // aggregate() does not auto-cast ids
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, 0]));
  let total = 0;
  for (const { _id, count } of agg) { byStatus[_id] = count; total += count; }
  res.json({ total, byStatus });
});

export const get = (req, res) => res.json({ customer: serializeCustomer(req.customer) });

export const updateStatus = asyncHandler(async (req, res) => {
  const updated = await Customer.findOneAndUpdate(
    { _id: req.customer._id, matchmaker: req.user.id },
    { status: req.body.status },
    { new: true, runValidators: true },
  ).lean();
  if (!updated) throw notFound('Customer');
  res.json({ customer: serializeCustomer(updated) });
});

export const addNote = asyncHandler(async (req, res) => {
  const updated = await Customer.findOneAndUpdate(
    { _id: req.customer._id, matchmaker: req.user.id },
    { $push: { notes: { text: req.body.text, author: req.user.name } } },
    { new: true, runValidators: true },
  ).lean();
  if (!updated) throw notFound('Customer');
  res.status(201).json({ notes: serializeCustomer(updated).notes });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const updated = await Customer.findOneAndUpdate(
    { _id: req.customer._id, matchmaker: req.user.id, 'notes._id': req.params.noteId },
    { $pull: { notes: { _id: req.params.noteId } } },
    { new: true },
  ).lean();
  if (!updated) throw notFound('Note');
  res.json({ notes: serializeCustomer(updated).notes });
});
