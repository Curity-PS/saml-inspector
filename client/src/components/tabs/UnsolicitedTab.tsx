import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollapsibleSection } from '../CollapsibleSection';
import { HostCuritySetup } from '../HostCuritySetup';
import { ParametersForm, type UnsolicitedForm } from '../ParametersForm';
import { UnsolicitedResult } from '../UnsolicitedResult';
import { sendUnsolicited } from '../../api/unsolicited';
import type {
  UnsolicitedDefaults,
  UnsolicitedInput,
  UnsolicitedResult as UnsolicitedResultData
} from '../../types/api';
import type { TabId } from '../../hooks/useTab';

interface UnsolicitedTabProps {
  defaults: UnsolicitedDefaults | null;
  cert: string;
  onMessagesChanged?: () => void;
  onNavigate?: (tab: TabId) => void;
}

/**
 * Orchestrator for the Unsolicited flow. Defaults + cert come from props
 * (lifted to App so SetupChecklist on Overview can share the same data).
 * Mutable form, submitting, result, and error state stay here — those are
 * per-flow-invocation and have no other consumer.
 *
 * The `result` state must NOT live above this component — the parent
 * `App.tsx` uses mount-all-then-hide for tab switching, so this stays
 * mounted, but a future refactor that conditionally unmounts tabs would
 * reintroduce the disappearing-tokens bug. See CLAUDE.md "React state gotcha".
 */
export function UnsolicitedTab({
  defaults,
  cert,
  onMessagesChanged,
  onNavigate
}: UnsolicitedTabProps) {
  const [form, setForm] = useState<UnsolicitedForm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UnsolicitedResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize the mutable form once defaults arrive. Don't overwrite
  // user-edited values on a subsequent re-render of defaults (defaults are
  // server-immutable per process, so this is defensive).
  useEffect(() => {
    if (defaults && !form) {
      setForm(defaults);
    }
  }, [defaults, form]);

  const update = <K extends keyof UnsolicitedForm>(key: K, value: UnsolicitedForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const submit = async () => {
    if (!form) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const input: UnsolicitedInput = { ...form };
      const r = await sendUnsolicited(input);
      setResult(r);
      onMessagesChanged?.();
    } catch (e) {
      const message = axios.isAxiosError(e)
        ? (e.response?.data as { error?: string })?.error ?? e.message
        : e instanceof Error
          ? e.message
          : 'Unknown error';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6 text-sm text-ink-500">
          Loading unsolicited test…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-500" />
          Unsolicited SAML Response Test
          <Badge variant="brand" className="ml-1 text-[10px] py-0">
            IdP-initiated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CollapsibleSection
          title="One Time Setup In Curity"
          defaultOpen={false}
          right={<Info className="h-4 w-4 text-ink-400" />}
        >
          <HostCuritySetup
            cert={cert}
            clientId={form.clientId}
            redirectUri={form.redirectUri}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Parameters" defaultOpen={true}>
          <ParametersForm
            form={form}
            onChange={update}
            onSubmit={submit}
            submitting={submitting}
          />
        </CollapsibleSection>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-md px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="break-all">{error}</div>
          </div>
        )}

        {result && <UnsolicitedResult result={result} onNavigate={onNavigate} />}
      </CardContent>
    </Card>
  );
}
