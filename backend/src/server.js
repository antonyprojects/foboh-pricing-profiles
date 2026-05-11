import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const app = createApp();

const server = app.listen(env.port, env.host, () => {
  logger.info(`pricing-api listening on http://${env.host}:${env.port}`);
  logger.info(`swagger-ui  → http://${env.host}:${env.port}/docs`);
  logger.info(`openapi.json → http://${env.host}:${env.port}/openapi.json`);
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
});
