import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import type { SamlConfigSnapshot } from '../types/api';

type CheckState = 'ok' | 'fail' | 'pending';

interface StatusStripProps {
  config: SamlConfigSnapshot | null;
  idpReachable: boolean | null;
}

/**
 * Sticky strip below the header showing whether the SP-Initiated flow's
 * prerequisites are met. Items derive from existing state — no extra
 * fetches.
 *
 * Editing the configuration itself lives on the SP-Initiated tab (the
 * config only governs that flow). Surfacing a global "Edit configuration"
 * link here would suggest the config is app-wide; it isn't.
 */
export function StatusStrip({ config, idpReachable }: StatusStripProps) {
  const configured: CheckState =
    !config?.entryPoint || config.entryPoint.includes('not-configured.example.com')
      ? 'fail'
      : 'ok';
  const reachable: CheckState =
    idpReachable === null ? 'pending' : idpReachable ? 'ok' : 'fail';
  const certState: CheckState = config?.hasCert ? 'ok' : 'fail';

  return (
    <div className="border-b border-hairline bg-surface-muted/70 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-2 flex items-center flex-wrap gap-x-6 gap-y-1 text-xs">
        <StatusItem label="SAML configured" state={configured} />
        <StatusItem label="IdP reachable" state={reachable} />
        <StatusItem label="IdP certificate" state={certState} />
      </div>
    </div>
  );
}

interface StatusItemProps {
  label: string;
  state: CheckState;
}

function StatusItem({ label, state }: StatusItemProps) {
  const Icon = state === 'ok' ? CheckCircle2 : state === 'fail' ? XCircle : CircleDashed;
  const color =
    state === 'ok'
      ? 'text-emerald-600'
      : state === 'fail'
        ? 'text-red-500'
        : 'text-ink-400';
  return (
    <span className={`flex items-center gap-1.5 font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}
