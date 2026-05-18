import { useCallback, useEffect, useState } from 'react';
import { getSession } from '../api/session';
import { getConfig } from '../api/config';
import { getMessages } from '../api/messages';
import type { MessageStore, SamlConfigSnapshot, SessionInfo } from '../types/api';

interface DiagnosticData {
  session: SessionInfo | null;
  config: SamlConfigSnapshot | null;
  messages: MessageStore;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<MessageStore>>;
}

const EMPTY_STORE: MessageStore = { requests: [], responses: [], assertions: [] };

/**
 * Fetches session/config/messages on mount and exposes a refetch hook.
 *
 * IMPORTANT — the `loading=true` is only flipped on the very first call.
 * Subsequent refetches (e.g. after a successful unsolicited POST) must not
 * tear down the rest of the tree, or child panels lose local state.
 *
 * Background: `UnsolicitedPanel` keeps its `result` in local state. If the
 * parent App component remounted `<main>` (which would happen if `loading`
 * flipped back to true during a refetch), that local state would be wiped
 * and tokens would disappear right after a successful send. See
 * CLAUDE.md → "React state gotcha".
 */
export function useDiagnosticData(): DiagnosticData {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [config, setConfig] = useState<SamlConfigSnapshot | null>(null);
  const [messages, setMessages] = useState<MessageStore>(EMPTY_STORE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    const isInitialLoad = session === null;
    if (isInitialLoad) setLoading(true);
    try {
      const [sessionData, configData, messagesData] = await Promise.all([
        getSession(),
        getConfig(),
        getMessages()
      ]);
      setSession(sessionData);
      setConfig(configData);
      setMessages(messagesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load application data');
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refetch();
    // refetch is intentionally only run on mount; the stable ref-by-callback
    // is re-created when session flips from null to non-null, but we don't
    // want to re-run on that transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, config, messages, loading, error, refetch, setMessages };
}
