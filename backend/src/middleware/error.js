import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req, _res, next) =>
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));

/** Single place that converts any thrown error into a consistent JSON response. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message } = err);
  } else if (err instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid request';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid data';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400; code = 'BAD_ID'; message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = 'This record already exists';
  } else if (err?.name === 'TokenExpiredError') {
    status = 401; code = 'TOKEN_EXPIRED'; message = 'Session expired, please sign in again';
  } else if (err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
    status = 401; code = 'UNAUTHENTICATED'; message = 'Invalid authentication token';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400; code = 'BAD_JSON'; message = 'Malformed JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413; code = 'TOO_LARGE'; message = 'Request body too large';
  }

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);
  else if (!env.isTest) logger.warn(`${status} ${code} ${req.method} ${req.originalUrl}: ${message}`);

  res.status(status).json({ error: { code, message, ...(details && { details }) } });
}
