import { useCallback, useEffect, useState } from 'react';

export type TabId = 'overview' | 'sp-initiated' | 'unsolicited' | 'inspector';

const TAB_IDS = ['overview', 'sp-initiated', 'unsolicited', 'inspector'] as const;
const DEFAULT_TAB: TabId = 'overview';

function readHash(): TabId {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (TAB_IDS as readonly string[]).includes(raw) ? (raw as TabId) : DEFAULT_TAB;
}

/**
 * Hash-based tab state. Reads `#/<tabId>` on mount, listens to browser
 * back/forward, and uses `pushState` on programmatic navigation so the
 * browser navigation arrows traverse tab history.
 *
 * Returns three things:
 *   • `tab`      — the current tab id
 *   • `navigate` — push a new tab onto history (back arrow returns)
 *   • `replace`  — swap the current history entry (used when arriving from
 *                  an external redirect like /?success=true, so the back
 *                  arrow doesn't return to a URL that re-fires side effects).
 *                  Also strips the query string so reloads don't refire.
 */
export function useTab(): readonly [
  TabId,
  (next: TabId) => void,
  (next: TabId) => void
] {
  const [tab, setTab] = useState<TabId>(() => readHash());

  useEffect(() => {
    const sync = () => setTab(readHash());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((next: TabId) => {
    if (next === readHash()) return;
    window.history.pushState({}, '', `#/${next}`);
    setTab(next);
  }, []);

  const replace = useCallback((next: TabId) => {
    // Use a fully-qualified path so the query string is stripped (a
    // relative `#/x` URL only updates the fragment, leaving any
    // ?success=true behind).
    window.history.replaceState({}, '', `${window.location.pathname}#/${next}`);
    setTab(next);
  }, []);

  return [tab, navigate, replace] as const;
}
