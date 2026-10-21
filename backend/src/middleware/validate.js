import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/**
 * Validates and replaces req.body / req.query / req.params with the parsed (typed, trimmed,
 * unknown-keys-stripped) values. ZodErrors are turned into 400s by the error middleware.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req[part] = schemas[part].parse(req[part]);
    }
    next();
  } catch (err) {
    next(err);
  }
};
