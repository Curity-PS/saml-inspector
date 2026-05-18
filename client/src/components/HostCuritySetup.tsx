import { KeyRound } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from './CopyButton';

interface CertStepProps {
  cert: string;
}

/**
 * Just step 1 — register the IdP signing cert on saml2-sp.
 * Used by SetupChecklist as the expanded body for the "cert registered"
 * item; also composed inside HostCuritySetup below.
 */
export function HostCuritySetupCert({ cert }: CertStepProps) {
  return (
    <div>
      <p className="text-xs text-ink-500 mb-2">
        Curity admin UI → Facilities → Signature Verification Keys → Add → reference it
        from the <code className="text-xs bg-ink-50 px-1 rounded">saml2-sp</code>{' '}
        authenticator.
      </p>
      <div className="flex items-start gap-2">
        <pre className="flex-1 text-[10px] bg-surface-muted border border-hairline rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap break-all">
          {cert || '(loading cert…)'}
        </pre>
        <CopyButton value={cert} label="Copy PEM" />
      </div>
    </div>
  );
}

interface RedirectStepProps {
  clientId: string;
  redirectUri: string;
}

/**
 * Just step 2 — register the redirect URI on the OAuth client.
 * Used by SetupChecklist as the expanded body for the "redirect URI
 * registered" item; also composed inside HostCuritySetup below.
 */
export function HostCuritySetupRedirect({ clientId, redirectUri }: RedirectStepProps) {
  return (
    <div>
      <p className="text-xs text-ink-500 mb-2">
        Curity admin UI → Token Service → Clients →{' '}
        <code className="text-xs bg-ink-50 px-1 rounded">{clientId}</code> → Redirect
        URIs → Add.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-surface-muted border border-hairline rounded px-2 py-1.5 break-all">
          {redirectUri}
        </code>
        <CopyButton value={redirectUri} label="Copy URL" />
      </div>
    </div>
  );
}

interface HostCuritySetupProps {
  cert: string;
  clientId: string;
  redirectUri: string;
}

/**
 * Both manual config steps needed on the host Curity, shown together.
 * Renders inside the UnsolicitedTab's "First-time setup" accordion.
 *
 * For the per-item drilldown on the Overview checklist, use the
 * HostCuritySetupCert / HostCuritySetupRedirect subcomponents directly so
 * each item only shows its own step.
 */
export function HostCuritySetup({ cert, clientId, redirectUri }: HostCuritySetupProps) {
  return (
    <div className="space-y-3 text-sm text-ink-700">
      <div>
        <div className="font-medium mb-1 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5" />
          1. Register the IdP signing cert on the{' '}
          <code className="text-xs bg-ink-50 px-1 rounded">saml2-sp</code> authenticator
        </div>
        <HostCuritySetupCert cert={cert} />
      </div>
      <Separator />
      <div>
        <div className="font-medium mb-1">
          2. Add the diagnostic app's callback URL to the OAuth client
        </div>
        <HostCuritySetupRedirect clientId={clientId} redirectUri={redirectUri} />
      </div>
    </div>
  );
}
