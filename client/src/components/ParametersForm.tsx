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
      <div className="flex items-center gap-4 mt-3 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.signAssertion !== false}
            onChange={(e) => onChange('signAssertion', e.target.checked)}
          />
          Sign assertion
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.signResponse !== false}
            onChange={(e) => onChange('signResponse', e.target.checked)}
          />
          Sign response
        </label>
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
