import { useState, type ComponentType, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  KeyRound,
  Link2,
  Server,
  Shield,
  Wifi,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { HostCuritySetupCert, HostCuritySetupRedirect } from './HostCuritySetup';
import type { SamlConfigSnapshot } from '../types/api';
import type { TabId } from '../hooks/useTab';

interface SetupChecklistProps {
  config: SamlConfigSnapshot | null;
  idpReachable: boolean | null;
  cert: string;
  clientId: string;
  redirectUri: string;
  onNavigate: (tab: TabId) => void;
}

/**
 * Per-flow prerequisites for the host Curity. Split into two groups so the
 * user can see at a glance which items relate to which flow:
 *   • SP-Initiated — passport-saml needs an entry point + cert, and the
 *     entry point must be reachable.
 *   • Unsolicited  — the host Curity needs to trust this app's signing
 *     cert AND have our redirect URI registered on the OAuth client.
 *     Both are Curity-side config we can't auto-detect, so they're
 *     user-confirmed checkboxes persisted in localStorage.
 */
export function SetupChecklist({
  config,
  idpReachable,
  cert,
  clientId,
  redirectUri,
  onNavigate
}: SetupChecklistProps) {
  const [certRegistered, setCertRegistered] = useLocalStorage<boolean>(
    'saml-inspector.setup.certRegistered',
    false
  );
  const [redirectRegistered, setRedirectRegistered] = useLocalStorage<boolean>(
    'saml-inspector.setup.redirectRegistered',
    false
  );

  const samlConfigured =
    !!config?.entryPoint && !config.entryPoint.includes('not-configured.example.com');
  const reachable: AutoState =
    idpReachable === null ? 'pending' : idpReachable ? 'ok' : 'fail';

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2 text-ink-500">
          <Check className="h-4 w-4" />
          Setup checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <FlowSection
          icon={Shield}
          title="SP-Initiated prerequisites"
          tabId="sp-initiated"
          onNavigate={onNavigate}
        >
          <AutoItem
            icon={Server}
            label="SAML configured"
            description="Entry point and certificate (or skip-cert-validation) are set in .env"
            state={samlConfigured ? 'ok' : 'fail'}
          />
          <AutoItem
            icon={Wifi}
            label="IdP reachable"
            description="Network HEAD probe to the entry point succeeds"
            state={reachable}
          />
        </FlowSection>

        <FlowSection
          icon={Zap}
          title="Unsolicited prerequisites"
          tabId="unsolicited"
          onNavigate={onNavigate}
        >
          <UserConfirmedItem
            icon={KeyRound}
            label="IdP signing cert registered on saml2-sp"
            description="Tells Curity to trust signatures produced by this app."
            checked={certRegistered}
            onChange={setCertRegistered}
          >
            <HostCuritySetupCert cert={cert} />
          </UserConfirmedItem>
          <UserConfirmedItem
            icon={Link2}
            label="Redirect URI registered on OAuth client"
            description="Curity needs to allow this app's callback URL on the OAuth client."
            checked={redirectRegistered}
            onChange={setRedirectRegistered}
          >
            <HostCuritySetupRedirect clientId={clientId} redirectUri={redirectUri} />
          </UserConfirmedItem>
        </FlowSection>
      </CardContent>
    </Card>
  );
}

// ─── Per-flow grouping ────────────────────────────────────────────────────

interface FlowSectionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  tabId: TabId;
  onNavigate: (tab: TabId) => void;
  children: ReactNode;
}

function FlowSection({ icon: Icon, title, tabId, onNavigate, children }: FlowSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-ink-50 pb-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
          {/* Brand-tinted icon tile — matches the icon treatment on the
              SP-Initiated / Unsolicited flow cards above, scaled down to
              fit alongside the small uppercase label. */}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {title}
        </h4>
        <button
          type="button"
          onClick={() => onNavigate(tabId)}
          className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 cursor-pointer"
        >
          Open
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ─── Items ────────────────────────────────────────────────────────────────

type AutoState = 'ok' | 'fail' | 'pending';

interface AutoItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  state: AutoState;
}

function AutoItem({ icon: Icon, label, description, state }: AutoItemProps) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <StateIndicator state={state} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-ink-400" />
          <span className="text-sm font-medium text-ink-800">{label}</span>
        </div>
        <p className="text-xs text-ink-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

interface UserConfirmedItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}

function UserConfirmedItem({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  children
}: UserConfirmedItemProps) {
  // Always collapsed by default — keep the checklist scannable and let the
  // user expand only the item they need details for.
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="py-1.5">
      <div className="flex items-start gap-3">
        <label className="flex items-center pt-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-ink-200"
          />
        </label>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-left cursor-pointer w-full"
            aria-expanded={expanded}
          >
            <Icon className="h-3.5 w-3.5 text-ink-400" />
            <span
              className={`text-sm font-medium ${
                checked ? 'text-ink-400 line-through' : 'text-ink-800'
              }`}
            >
              {label}
            </span>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-ink-400 ml-auto" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-ink-400 ml-auto" />
            )}
          </button>
          <p className="text-xs text-ink-500 mt-0.5">{description}</p>
          {expanded && <div className="mt-3 pl-1">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function StateIndicator({ state }: { state: AutoState }) {
  if (state === 'ok') {
    return (
      <span
        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white mt-0.5"
        aria-label="complete"
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'fail') {
    return (
      <span
        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-semibold mt-0.5"
        aria-label="failed"
      >
        !
      </span>
    );
  }
  return <CircleDashed className="h-4 w-4 text-ink-400 mt-0.5" aria-label="pending" />;
}
