import winston from "winston";
import { env } from "./env.js";

const { combine, timestamp, errors, splat, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: env.logLevel,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    env.nodeEnv === "production" ? json() : combine(colorize(), devFormat),
  ),
  transports: [new winston.transports.Console()],
});

// Morgan adapter — pipes HTTP access logs through winston at `http` level.
export const morganStream = {
  write: (line) => logger.http(line.trim()),
};
