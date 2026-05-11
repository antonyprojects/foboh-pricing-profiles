/**
 * Express middleware that validates `req.body`, `req.query`, or `req.params`
 * against a Zod schema. On success the parsed (and coerced) value replaces
 * the original; on failure the ZodError propagates to the error handler.
 */
export const validate = (schemasByLocation) => (req, _res, next) => {
  try {
    for (const [location, schema] of Object.entries(schemasByLocation)) {
      const parsed = schema.parse(req[location]);
      req[location] = parsed;
    }
    next();
  } catch (err) {
    next(err);
  }
};
