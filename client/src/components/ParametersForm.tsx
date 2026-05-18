import { Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UnsolicitedDefaults } from '../types/api';

export interface UnsolicitedForm extends UnsolicitedDefaults {
  signAssertion?: boolean;
  signResponse?: boolean;
}

interface ParametersFormProps {
  form: UnsolicitedForm;
  onChange: <K extends keyof UnsolicitedForm>(key: K, value: UnsolicitedForm[K]) => void;
  onSubmit: () => void;
  submitting: boolean;
}

/**
 * The parameters editor for the Unsolicited flow. State and submission are
 * owned by the parent — this component is presentational so it stays cheap
 * to re-mount when the tab system shows/hides the panel.
 */
export function ParametersForm({ form, onChange, onSubmit, submitting }: ParametersFormProps) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField
          label="Subject NameID"
          value={form.nameId ?? ''}
          onChange={(v) => onChange('nameId', v)}
        />
        <FormField
          label="Audience"
          value={form.audience ?? ''}
          onChange={(v) => onChange('audience', v)}
        />
        <FormField
          label="OAuth client_id"
          value={form.clientId ?? ''}
          onChange={(v) => onChange('clientId', v)}
        />
        <FormField
          label="OAuth client_secret"
          type="password"
          value={form.clientSecret ?? ''}
          onChange={(v) => onChange('clientSecret', v)}
        />
        <FormField
          label="redirect_uri"
          value={form.redirectUri ?? ''}
          onChange={(v) => onChange('redirectUri', v)}
        />
        <FormField
          label="Scope"
          value={form.scope ?? ''}
          onChange={(v) => onChange('scope', v)}
        />
      </div>
      <div className="flex items-center gap-6 mt-4 text-sm">
        <Toggle
          label="Sign assertion"
          checked={form.signAssertion !== false}
          onChange={(v) => onChange('signAssertion', v)}
        />
        <Toggle
          label="Sign response"
          checked={form.signResponse !== false}
          onChange={(v) => onChange('signResponse', v)}
        />
      </div>
      <div className="flex items-center justify-center mt-5">
        <Button size="lg" onClick={onSubmit} disabled={submitting} className="px-8">
          <Zap className="h-4 w-4" />
          {submitting ? 'Sending…' : 'Send Unsolicited Response'}
        </Button>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}

function FormField({ label, value, type, onChange }: FormFieldProps) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className="relative inline-block h-5 w-9 rounded-full bg-ink-200 transition-colors
                   peer-checked:bg-brand-500
                   peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300 peer-focus-visible:ring-offset-1
                   after:content-[''] after:absolute after:top-0.5 after:left-0.5
                   after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow
                   after:transition-transform peer-checked:after:translate-x-4"
      />
      <span className="text-ink-700">{label}</span>
    </label>
  );
}
