import type { ComponentType } from 'react';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SetupChecklist } from '../SetupChecklist';
import type { SamlConfigSnapshot } from '../../types/api';
import type { TabId } from '../../hooks/useTab';

interface OverviewTabProps {
  onNavigate: (tab: TabId) => void;
  config: SamlConfigSnapshot | null;
  idpReachable: boolean | null;
  cert: string;
  clientId: string;
  redirectUri: string;
}

/**
 * The default tab on first load. Frames the two flows and surfaces the
 * setup checklist so new users see at a glance what's missing before they
 * start clicking around.
 */
export function OverviewTab({
  onNavigate,
  config,
  idpReachable,
  cert,
  clientId,
  redirectUri
}: OverviewTabProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">
          Diagnostics
        </p>
        <h2 className="text-2xl font-semibold text-ink-900 tracking-tight">
          Test your SAML flows
        </h2>
        <p className="text-sm text-ink-500 mt-2 max-w-2xl leading-relaxed">
          This tool drives two SAML flows against a Curity Identity Server. Pick one
          to start, then use the Inspector tab to view captured SAML messages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FlowCard
          icon={Shield}
          title="SP-Initiated"
          description="Standard browser flow: click Sign In, get redirected to the IdP, log in, and the assertion is POSTed back. Use this to verify your normal SAML SP setup against Curity SAML IDP end-to-end."
          ctaLabel="Open SP-Initiated"
          onClick={() => onNavigate('sp-initiated')}
        />
        <FlowCard
          icon={Zap}
          title="Unsolicited"
          description="Hand-crafted IdP-initiated SAML Response. Signs and POSTs unsolicited SAML response to the saml2 authenticator, drives the OAuth code flow and returns tokens."
          ctaLabel="Open Unsolicited"
          onClick={() => onNavigate('unsolicited')}
        />
      </div>

      <SetupChecklist
        config={config}
        idpReachable={idpReachable}
        cert={cert}
        clientId={clientId}
        redirectUri={redirectUri}
        onNavigate={onNavigate}
      />
    </section>
  );
}

interface FlowCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
}

function FlowCard({ icon: Icon, title, description, ctaLabel, onClick }: FlowCardProps) {
  return (
    <Card className="group animate-slide-up transition-all hover:border-brand-200 hover:-translate-y-0.5 hover:brand-glow-sm">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          {/* Icon tile — soft brand wash that intensifies on card hover. */}
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        </div>
        <p className="text-sm text-ink-500 leading-relaxed">{description}</p>
        <Button onClick={onClick} variant="outline" className="mt-2">
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
