import { useEffect, useState } from 'react';
import { getIdpStatus } from '../api/idpStatus';

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls /api/idp-status every 30s. Returns null until the first check
 * resolves, then `true` (reachable) or `false` (not reachable or errored).
 */
export function useIdpStatus(): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async (): Promise<void> => {
      try {
        const status = await getIdpStatus();
        if (!cancelled) setReachable(status.reachable);
      } catch {
        if (!cancelled) setReachable(false);
      }
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return reachable;
}
