import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CollapsibleSection } from './CollapsibleSection';
import { CopyButton } from './CopyButton';
import { FlowStepper, type Step } from './FlowStepper';
import type { UnsolicitedResult as UnsolicitedResultData } from '../types/api';
import type { TabId } from '../hooks/useTab';

const TOKEN_KEYS = ['access_token', 'id_token', 'refresh_token'] as const;

interface UnsolicitedResultProps {
  result: UnsolicitedResultData;
  onNavigate?: (tab: TabId) => void;
}

/**
 * Renders the result of a single Send Unsolicited Response invocation:
 * stepper, success/failure banner, HTTP trace, tokens, decoded id_token
 * claims, and a deep-link to the Inspector for the captured SAML XML.
 *
 * Display-only — all state lives in the parent (UnsolicitedTab).
 */
export function UnsolicitedResult({ result, onNavigate }: UnsolicitedResultProps) {
  return (
    <div className="space-y-4">
      <FlowStepper steps={stepsFromResult(result)} />

      {result.ok ? (
        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <div>
              End-to-end OK — id_token sub ={' '}
              <code className="font-semibold">{result.decodedIdToken?.sub ?? '?'}</code>
            </div>
          </div>
          {onNavigate && (
            <InspectorLink
              variant="success"
              onClick={() => onNavigate('inspector')}
            />
          )}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed at step {result.failedStep}: {result.failedStepName} (HTTP{' '}
              {result.status})
            </div>
            {onNavigate && (
              <InspectorLink
                variant="error"
                onClick={() => onNavigate('inspector')}
              />
            )}
          </div>
          <pre className="mt-2 text-xs bg-white border border-red-100 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
            {result.body}
          </pre>
        </div>
      )}

      {result.trace && result.trace.length > 0 && (
        <CollapsibleSection title="HTTP trace" defaultOpen={true}>
          <div className="overflow-hidden rounded-md border border-hairline">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted/60 text-[10px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">Method</th>
                  <th className="text-left font-semibold px-3 py-2">Path</th>
                  <th className="text-right font-semibold px-3 py-2">Status</th>
                  <th className="text-right font-semibold px-3 py-2">Latency</th>
                </tr>
              </thead>
              <tbody>
                {result.trace.map((t, i) => {
                  // t.step is typically "METHOD /path/segment" — split on
                  // the first space so the method renders as its own pill.
                  const spaceIdx = t.step.indexOf(' ');
                  const method = spaceIdx > 0 ? t.step.slice(0, spaceIdx) : t.step;
                  const path = spaceIdx > 0 ? t.step.slice(spaceIdx + 1) : '';
                  return (
                    <tr
                      key={i}
                      className="border-t border-hairline odd:bg-surface-muted/30 hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-3 py-2 text-ink-400 font-mono tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <MethodBadge method={method} />
                      </td>
                      <td className="px-3 py-2 font-mono text-ink-700 break-all">
                        {path}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-2 text-right text-ink-500 font-mono tabular-nums">
                        {t.ms} ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      {result.ok && (
        <CollapsibleSection title="Tokens" defaultOpen={false}>
          <div className="space-y-3">
            {TOKEN_KEYS.map((k) => (
              <TokenCard key={k} name={k} value={result.tokens[k]} />
            ))}
            {result.tokens.expires_in != null && (
              <div className="flex flex-wrap gap-2 pt-1">
                <MetaChip label="expires_in" value={`${result.tokens.expires_in}s`} />
                <MetaChip label="token_type" value={String(result.tokens.token_type)} />
              </div>
            )}
          </div>

          {result.decodedIdToken && (
            <>
              <Separator className="my-5" />
              <div>
                <h5 className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  ID Token Claims
                </h5>
                <div className="overflow-hidden rounded-md border border-hairline">
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(result.decodedIdToken).map(([k, v], i) => (
                        <tr
                          key={k}
                          className={i % 2 === 1 ? 'bg-surface-muted/40' : ''}
                        >
                          <td className="py-1.5 px-3 font-mono text-ink-500 align-top w-1/3">
                            {k}
                          </td>
                          <td className="py-1.5 px-3 break-all font-mono text-ink-800">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CollapsibleSection>
      )}

      {/*
        Sent SAML XML removed — every unsolicited send is captured into the
        messageStore by routes/unsolicited.ts (`source: 'unsolicited'`), so
        the XML is viewable on the Inspector tab without duplicating it
        here. Filter the Inspector by "Unsolicited" to find this send.
      */}
    </div>
  );
}

interface InspectorLinkProps {
  variant: 'success' | 'error';
  onClick: () => void;
}

function InspectorLink({ variant, onClick }: InspectorLinkProps) {
  const colorClass =
    variant === 'success'
      ? 'text-emerald-700 hover:text-emerald-900'
      : 'text-red-700 hover:text-red-900';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline cursor-pointer shrink-0 ${colorClass}`}
    >
      Inspect XML
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

interface TokenCardProps {
  name: string;
  value: unknown;
}

function TokenCard({ name, value }: TokenCardProps) {
  if (value == null || value === '') return null;
  const stringValue = String(value);
  const isJwt = typeof value === 'string' && value.split('.').length === 3;
  const isOpaque = typeof value === 'string' && value.startsWith('_');
  return (
    <div className="rounded-lg border border-hairline bg-white overflow-hidden">
      {/* Two-tier layout: header strip carries metadata + copy, value area
          stays focused on the token itself. */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-muted/60 border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-ink-700 uppercase tracking-wider">
            {name}
          </span>
          {isJwt && (
            <Badge variant="brand" className="text-[10px] py-0">
              JWT
            </Badge>
          )}
          {!isJwt && isOpaque && (
            <Badge variant="secondary" className="text-[10px] py-0">
              Opaque
            </Badge>
          )}
        </div>
        <CopyButton value={value} />
      </div>
      <code className="block text-xs break-all bg-white px-3 py-2.5 max-h-32 overflow-auto leading-relaxed text-ink-800 custom-scrollbar">
        {stringValue}
      </code>
    </div>
  );
}

// ─── Trace helpers ────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  // HTTP method palette — POST is brand-tinted (since it's the dominant
  // method in the unsolicited flow), the rest use semantic tones.
  const tone =
    m === 'GET'
      ? 'bg-sky-50 text-sky-700'
      : m === 'POST'
        ? 'bg-brand-50 text-brand-700'
        : m === 'PUT' || m === 'PATCH'
          ? 'bg-amber-50 text-amber-700'
          : m === 'DELETE'
            ? 'bg-red-50 text-red-700'
            : 'bg-ink-50 text-ink-700';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${tone}`}
    >
      {m}
    </span>
  );
}

function StatusBadge({ status }: { status: number | string }) {
  const n = typeof status === 'number' ? status : parseInt(String(status), 10);
  // Status class palette — RFC-style: 2xx ok, 3xx redirect, 4xx client, 5xx server.
  const tone =
    n >= 200 && n < 300
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : n >= 300 && n < 400
        ? 'bg-sky-50 text-sky-700 ring-sky-100'
        : n >= 400 && n < 500
          ? 'bg-amber-50 text-amber-800 ring-amber-100'
          : n >= 500
            ? 'bg-red-50 text-red-700 ring-red-100'
            : 'bg-ink-50 text-ink-700 ring-ink-100';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-50 text-[11px]">
      <span className="text-ink-400 font-medium">{label}</span>
      <span className="font-semibold text-ink-800 font-mono">{value}</span>
    </span>
  );
}

function stepsFromResult(result: UnsolicitedResultData): Step[] {
  const labels = ['Build & sign', 'POST to ACS', 'Fetch tokens'];

  if (result.ok) {
    return labels.map((label) => ({ label, state: 'complete' as const }));
  }
  // Failure: result.failedStep is 1, 2, or 3.
  return labels.map((label, idx) => {
    const stepNumber = idx + 1;
    if (stepNumber < result.failedStep) return { label, state: 'complete' as const };
    if (stepNumber === result.failedStep) return { label, state: 'failed' as const };
    return { label, state: 'pending' as const };
  });
}
