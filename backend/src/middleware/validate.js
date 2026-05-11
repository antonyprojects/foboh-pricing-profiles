const VALID_LOCATIONS = new Set(["body", "query", "params", "headers"]);

/**
 * Express middleware that validates `req.body`, `req.query`, or `req.params`
 * against a Zod schema. On success the parsed (and coerced) value replaces
 * the original; on failure the ZodError propagates to the error handler.
 *
 * Error handling stance: the *configuration* of validate() (the object
 * passed when wiring up routes) is asserted at module load time, not on
 * every request. A typo there is a programmer bug; we'd rather fail at
 * boot than have every request 500.
 */
export const validate = (schemasByLocation) => {
  if (!schemasByLocation || typeof schemasByLocation !== "object") {
    throw new TypeError(`validate(): expected an object, got ${typeof schemasByLocation}`);
  }
  const entries = Object.entries(schemasByLocation);
  if (entries.length === 0) {
    throw new TypeError("validate(): at least one location is required");
  }
  for (const [location, schema] of entries) {
    if (!VALID_LOCATIONS.has(location)) {
      throw new RangeError(
        `validate(): unknown location "${location}" (expected one of ${[...VALID_LOCATIONS].join(", ")})`,
      );
    }
    if (!schema || typeof schema.parse !== "function") {
      throw new TypeError(`validate(): schema for "${location}" is not a Zod schema`);
    }
  }

  return (req, _res, next) => {
    try {
      for (const [location, schema] of entries) {
        req[location] = schema.parse(req[location]);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
