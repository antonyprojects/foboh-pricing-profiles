import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { morganStream } from "./config/logger.js";
import { openApiSpec } from "./config/swagger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

import healthRouter from "./routes/health.js";
import productsRouter from "./routes/products.js";
import customersRouter from "./routes/customers.js";
import profilesRouter from "./routes/profiles.js";

/**
 * Builds the Express app. Kept separate from `server.js` so tests can
 * mount the app without binding a port.
 */
export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny", { stream: morganStream }));

  app.get("/", (_req, res) => res.json({ name: "foboh-pricing-api", docs: "/docs" }));
  app.use("/api/health", healthRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/profiles", profilesRouter);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
  app.get("/openapi.json", (_req, res) => res.json(openApiSpec));

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
