import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny localStorage-backed state hook. Persists across reloads and stays in
 * sync between tabs of the same app via the `storage` event.
 *
 * No SSR concerns — this is a Vite SPA, `window` is always available.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Quota exceeded / private-browsing mode — fall back to in-memory only.
      }
    },
    [key]
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        // Ignore malformed JSON written by another tab.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, set];
}
