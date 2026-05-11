import "dotenv/config";

const intFromEnv = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Env var ${name} must be an integer, got "${raw}"`);
  }
  return n;
};

const corsFromEnv = () => {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") return "*";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

export const env = Object.freeze({
  port: intFromEnv("PORT", 4000),
  host: process.env.HOST?.trim() || "0.0.0.0",
  corsOrigin: corsFromEnv(),
  logLevel: process.env.LOG_LEVEL?.trim() || "info",
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
});
