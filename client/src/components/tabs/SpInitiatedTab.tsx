import ConfigPanel from '../ConfigPanel';
import Dashboard from '../Dashboard';
import SessionInfo from '../SessionInfo';
import type { ConfigUpdate, SamlConfigSnapshot, SessionInfo as SessionInfoData } from '../../types/api';

interface SpInitiatedTabProps {
  session: SessionInfoData | null;
  config: SamlConfigSnapshot | null;
  onLogin: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onConfigUpdate: (update: ConfigUpdate) => void;
}

/**
 * The SP-Initiated tab. Composes:
 *   • Dashboard         — auth status + Sign In/Sign Out
 *   • SessionInfo       — current user attributes + session index
 *   • ConfigPanel       — the passport-saml strategy options (entry point,
 *                          issuer, callback URL, IdP cert). Lives here
 *                          because it only governs this flow.
 */
export function SpInitiatedTab({
  session,
  config,
  onLogin,
  onLogout,
  onRefresh,
  onConfigUpdate
}: SpInitiatedTabProps) {
  return (
    <section className="space-y-6">
      <Dashboard
        session={session}
        onLogin={onLogin}
        onLogout={onLogout}
        onRefresh={onRefresh}
      />
      <SessionInfo session={session} />
      <ConfigPanel config={config} onUpdate={onConfigUpdate} />
    </section>
  );
}
