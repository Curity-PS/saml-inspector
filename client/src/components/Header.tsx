import { CircleDashed, Wifi, WifiOff } from 'lucide-react';
import { CurityLogo } from './CurityLogo';
import type { SamlConfigSnapshot } from '../types/api';

interface HeaderProps {
  config: SamlConfigSnapshot | null;
  idpReachable: boolean | null;
}

export function Header({ config, idpReachable }: HeaderProps) {
  const notConfigured = !config?.entryPoint;
  const StatusIcon = notConfigured ? CircleDashed : idpReachable ? Wifi : WifiOff;
  const statusText = notConfigured
    ? 'Not Configured'
    : idpReachable
      ? 'IDP Reachable'
      : 'IDP Unreachable';
  // Status pill colors tuned for the dark header background.
  const statusColor = notConfigured
    ? 'text-ink-300'
    : idpReachable
      ? 'text-emerald-400'
      : 'text-red-400';

  return (
    <header className="relative bg-ink-900 border-b border-ink-700 sticky top-0 z-50">
      {/* Pink ambient bloom — mirrors curity.io's hero glow effect. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background:
            'radial-gradient(600px 200px at 70% 100%, rgba(216, 89, 161, 0.25), transparent 70%)'
        }}
      />
      <div className="relative max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand block: official Curity wordmark + divider + tool name.
            Common multi-product console pattern — the brand identifies the
            vendor, the tool name identifies which app within that vendor. */}
        <div className="flex items-center gap-4">
          <CurityLogo className="h-7 w-auto text-white" />
          <span aria-hidden className="h-6 w-px bg-white/15" />
          <h1 className="text-sm font-medium text-white tracking-tight">
            SAML Inspector
          </h1>
        </div>
        {/* Pill-shaped status — matches Curity's rounded-full chip style. */}
        <div
          className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm ${statusColor}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{statusText}</span>
        </div>
      </div>
    </header>
  );
}
