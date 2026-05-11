import { randomUUID } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * 16-char monotonic-ish id with a prefix. Not a real ULID, but stable
 * sortable enough for an in-memory demo and short enough to eyeball.
 */
export const newId = (prefix) => {
  const ts = Date.now().toString(36).toUpperCase().padStart(9, "0");
  const u = randomUUID().replace(/-/g, "").toUpperCase();
  let rand = "";
  for (let i = 0; i < 6; i += 1) {
    rand += ALPHABET[parseInt(u[i], 16) % ALPHABET.length];
  }
  return `${prefix}_${ts}${rand}`;
};
