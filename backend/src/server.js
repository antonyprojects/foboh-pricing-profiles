import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const app = createApp();

const server = app.listen(env.port, env.host, () => {
  logger.info(`pricing-api listening on http://${env.host}:${env.port}`);
  logger.info(`swagger-ui  → http://${env.host}:${env.port}/docs`);
  logger.info(`openapi.json → http://${env.host}:${env.port}/openapi.json`);
});

// app.listen() reports binding errors (EADDRINUSE, EACCES) on the server
// object, NOT through the callback. Without this handler the process
// exits with no useful message and `npm run dev` looks healthy.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`Port ${env.port} is already in use. Set PORT to something free in backend/.env.`);
  } else if (err.code === "EACCES") {
    logger.error(`Permission denied binding port ${env.port} (need root for <1024, or pick PORT >= 1024).`);
  } else {
    logger.error("Server failed to start", { code: err.code, message: err.message });
  }
  process.exit(1);
});

let shuttingDown = false;
const shutdown = (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down`);
  server.close((closeErr) => {
    if (closeErr) {
      logger.error("Error closing server", { err: closeErr.message });
      process.exit(1);
      return;
    }
    process.exit(exitCode);
  });
  // If close() hangs (keep-alive sockets, etc.) bail after 10s so the
  // process doesn't sit forever in CI / container orchestrators.
  setTimeout(() => {
    logger.warn("Forced exit after 10s shutdown grace");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// `uncaughtException` and `unhandledRejection` both indicate the process
// state may be corrupt. In development we log and keep running so the
// developer can see the error in the same terminal; in production we
// log and exit so a supervisor (pm2, k8s, systemd) can restart cleanly.
const crashOnUnknownError = env.nodeEnv === "production";

process.on("uncaughtException", (err, origin) => {
  logger.error("uncaughtException", { origin, name: err?.name, message: err?.message, stack: err?.stack });
  if (crashOnUnknownError) shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection", {
    name: reason?.name,
    message: reason?.message ?? String(reason),
    stack: reason?.stack,
  });
  if (crashOnUnknownError) shutdown("unhandledRejection", 1);
});
