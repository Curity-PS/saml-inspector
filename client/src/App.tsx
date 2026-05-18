import { useEffect, useState } from 'react';
import { AlertBanner } from './components/AlertBanner';
import { Header } from './components/Header';
import { StatusStrip } from './components/StatusStrip';
import { TabBar } from './components/TabBar';
import { InspectorTab } from './components/tabs/InspectorTab';
import { OverviewTab } from './components/tabs/OverviewTab';
import { SpInitiatedTab } from './components/tabs/SpInitiatedTab';
import { UnsolicitedTab } from './components/tabs/UnsolicitedTab';
import { useDiagnosticData } from './hooks/useDiagnosticData';
import { useIdpStatus } from './hooks/useIdpStatus';
import { useTab } from './hooks/useTab';
import { clearMessages } from './api/messages';
import { updateConfig } from './api/config';
import { getUnsolicitedCert, getUnsolicitedDefaults } from './api/unsolicited';
import type { ConfigUpdate, MessageStore, UnsolicitedDefaults } from './types/api';

const EMPTY_STORE: MessageStore = { requests: [], responses: [], assertions: [] };

function App() {
  const { session, config, messages, loading, refetch, setMessages } = useDiagnosticData();
  const idpReachable = useIdpStatus();
  const [tab, navigate, replaceTab] = useTab();

  // Lifted from UnsolicitedTab — both UnsolicitedTab and the SetupChecklist
  // on Overview consume these.
  const [unsolicitedDefaults, setUnsolicitedDefaults] = useState<UnsolicitedDefaults | null>(
    null
  );
  const [unsolicitedCert, setUnsolicitedCert] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Apply query-string status flags from the SAML callback redirect.
  // All three flags (?success / ?logout / ?error) come from the SP-Initiated
  // flow's server-side redirect — land the user on that tab so the banner
  // they see matches the flow they were running.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successFlag = params.get('success');
    const logoutFlag = params.get('logout');
    const errorFlag = params.get('error');

    if (!successFlag && !logoutFlag && !errorFlag) return;

    if (successFlag) setSuccess('Successfully authenticated with SAML!');
    else if (logoutFlag) setSuccess('Successfully logged out');
    else if (errorFlag) setError(decodeURIComponent(errorFlag));

    // `replaceTab` strips the query string AND points the hash at the
    // SP-Initiated tab in one swap. Using replace (not push) means hitting
    // Back doesn't return to /?success=true and refire the banner.
    replaceTab('sp-initiated');
  }, [replaceTab]);

  useEffect(() => {
    getUnsolicitedDefaults()
      .then(setUnsolicitedDefaults)
      .catch(() => setUnsolicitedDefaults(null));
    getUnsolicitedCert()
      .then(setUnsolicitedCert)
      .catch(() => setUnsolicitedCert(''));
  }, []);

  const handleLogin = () => {
    window.location.href = '/saml/login';
  };

  const handleLogout = () => {
    window.location.href = '/saml/logout';
  };

  const handleClearMessages = async () => {
    try {
      await clearMessages();
      setMessages(EMPTY_STORE);
      setSuccess('Messages cleared');
    } catch {
      setError('Failed to clear messages');
    }
  };

  const handleConfigUpdate = async (newConfig: ConfigUpdate) => {
    try {
      await updateConfig(newConfig);
      setSuccess('Configuration updated successfully');
      void refetch();
    } catch {
      setError('Failed to update configuration');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <Header config={null} idpReachable={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-300 loading-dot" />
            <span className="h-2 w-2 rounded-full bg-brand-300 loading-dot" />
            <span className="h-2 w-2 rounded-full bg-brand-300 loading-dot" />
          </div>
        </div>
      </div>
    );
  }

  const totalMessages =
    (messages.requests?.length ?? 0) +
    (messages.responses?.length ?? 0) +
    (messages.assertions?.length ?? 0);

  const clientId = unsolicitedDefaults?.clientId ?? '';
  const redirectUri = unsolicitedDefaults?.redirectUri ?? '';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header config={config} idpReachable={idpReachable} />
      <StatusStrip config={config} idpReachable={idpReachable} />
      <TabBar current={tab} onChange={navigate} messageCount={totalMessages} />

      <main className="max-w-5xl w-full mx-auto px-6 py-8 flex-1">
        {/*
          When the banner appears post-SAML-callback there are typically
          captured messages already in the store — surface a quick way to
          jump to the Inspector so users discover where the SAML XML went.
        */}
        {error && (
          <AlertBanner
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            action={
              totalMessages > 0
                ? { label: 'View captured messages →', onClick: () => navigate('inspector') }
                : undefined
            }
          />
        )}
        {success && (
          <AlertBanner
            variant="success"
            message={success}
            onDismiss={() => setSuccess(null)}
            action={
              totalMessages > 0
                ? { label: 'View captured messages →', onClick: () => navigate('inspector') }
                : undefined
            }
          />
        )}

        {/*
          Inactive tabs stay mounted (hidden via the HTML `hidden` attribute)
          so each panel's local state survives tab switches. Unmounting
          would, for example, wipe UnsolicitedPanel's `result` when the
          user pops over to Inspector — the same symptom as the React-state
          gotcha documented in CLAUDE.md, just triggered by tab nav.
        */}
        <div hidden={tab !== 'overview'}>
          <OverviewTab
            onNavigate={navigate}
            config={config}
            idpReachable={idpReachable}
            cert={unsolicitedCert}
            clientId={clientId}
            redirectUri={redirectUri}
          />
        </div>
        <div hidden={tab !== 'sp-initiated'}>
          <SpInitiatedTab
            session={session}
            config={config}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onRefresh={refetch}
            onConfigUpdate={handleConfigUpdate}
          />
        </div>
        <div hidden={tab !== 'unsolicited'}>
          <UnsolicitedTab
            defaults={unsolicitedDefaults}
            cert={unsolicitedCert}
            onMessagesChanged={refetch}
            onNavigate={navigate}
          />
        </div>
        <div hidden={tab !== 'inspector'}>
          <InspectorTab
            messages={messages}
            onClear={handleClearMessages}
            onRefresh={refetch}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
