import { Customer } from '../models/Customer.js';
import { notFound } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Loads :id as a lean customer scoped to the signed-in matchmaker.
 * Another matchmaker's customer returns 404 (not 403) so ids can't be probed.
 */
export const loadCustomer = asyncHandler(async (req, _res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, matchmaker: req.user.id }).lean();
  if (!customer) throw notFound('Customer');
  req.customer = customer;
  next();
});
