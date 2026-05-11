import { useEffect, useState } from "react";

/**
 * Returns a debounced echo of `value`. The first emission happens
 * immediately so callers don't need a separate "initial load" path.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 250): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
};
