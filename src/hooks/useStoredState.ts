import { useEffect, useState } from "react";

export function useStoredState<T extends string | number>(
  key: string,
  fallback: T,
  validate: (value: string) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : validate(saved);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* Keep preferences in memory when storage is unavailable. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
