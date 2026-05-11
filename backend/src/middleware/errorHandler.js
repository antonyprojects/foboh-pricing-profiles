import { randomBytes } from "node:crypto";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

/**
 * Domain-level error with an HTTP status. Throw these from services/routes
 * to get a clean JSON error response without an internal stack trace.
 */
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Wraps an async route handler so a rejected promise becomes a `next(err)`
 * call. Express 4 only forwards *sync* throws automatically; without this,
 * an async handler that throws hangs the request and the error never
 * reaches our `errorHandler`. Apply to anything `async` in routes.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  // Promise.resolve absorbs both sync throws and async rejections, so
  // callers get the same behavior either way.
  Promise.resolve()
    .then(() => fn(req, res, next))
    .catch(next);
};

export const notFound = (req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.originalUrl}` },
  });
};

const newErrorId = () => randomBytes(4).toString("hex");

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Headers already flushed (e.g. error mid-stream) — delegate to Express
  // default closer so we don't try to write a JSON body to a dead socket.
  if (res.headersSent) {
    logger.error("Error fired after headers sent", { err: err?.message, path: req.originalUrl });
    return;
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request payload failed validation",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Body parser / express.json failures land here with a `status` set.
  if (err && typeof err.status === "number" && err.status < 500) {
    return res.status(err.status).json({
      error: { code: err.type || "BAD_REQUEST", message: err.message || "Bad request" },
    });
  }

  // Anything else is an unexpected programmer/data error. Don't leak it
  // to the caller, but log loudly with a correlation id so operators can
  // grep the logs from the response.
  const errorId = newErrorId();
  logger.error("Unhandled error", {
    errorId,
    method: req.method,
    url: req.originalUrl,
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
  });
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Quote this id to support.",
      errorId,
    },
  });
};
