import { useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Pencil,
  Download,
  ArrowLeft,
  Save,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { parseMetadata as parseMetadataApi } from '../api/config';
import type {
  ConfigUpdate,
  MetadataType,
  ParsedIdpMetadata,
  ParsedSpMetadata,
  SamlConfigSnapshot
} from '../types/api';

interface ConfigPanelProps {
  config: SamlConfigSnapshot | null;
  onUpdate: (update: ConfigUpdate) => void;
}

interface ConfigFormState {
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
}

const EMPTY_FORM: ConfigFormState = {
  entryPoint: '',
  issuer: '',
  callbackUrl: '',
  cert: ''
};

function ConfigPanel({ config, onUpdate }: ConfigPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showMetadataImport, setShowMetadataImport] = useState(false);
  const [metadataInput, setMetadataInput] = useState('');
  const [metadataType, setMetadataType] = useState<MetadataType>('idp');
  const [parseError, setParseError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [formData, setFormData] = useState<ConfigFormState>(EMPTY_FORM);

  const handleEdit = () => {
    setFormData({
      entryPoint: config?.entryPoint ?? '',
      issuer: config?.issuer ?? '',
      callbackUrl: config?.callbackUrl ?? '',
      cert: ''
    });
    setIsEditing(true);
    setImportSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowMetadataImport(false);
    setMetadataInput('');
    setParseError('');
    setImportSuccess('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleParseMetadata = async () => {
    if (!metadataInput.trim()) {
      setParseError('Please paste metadata XML');
      return;
    }
    try {
      setParseError('');
      setImportSuccess('');
      const response = await parseMetadataApi(metadataInput, metadataType);
      if (response.success) {
        const parsed = response.config;
        setFormData((prev) => ({
          ...prev,
          ...(isIdpMetadata(parsed)
            ? {
                ...(parsed.entryPoint && { entryPoint: parsed.entryPoint }),
                ...(parsed.cert && { cert: parsed.cert })
              }
            : {}),
          ...(parsed.issuer && { issuer: parsed.issuer }),
          ...(isSpMetadata(parsed) && parsed.callbackUrl
            ? { callbackUrl: parsed.callbackUrl }
            : {})
        }));
        setShowMetadataImport(false);
        setMetadataInput('');
        setImportSuccess(`Successfully imported ${metadataType.toUpperCase()} metadata`);
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error ?? 'Failed to parse metadata'
        : 'Failed to parse metadata';
      setParseError(message);
    }
  };

  if (!isEditing) {
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-ink-500">
              <Settings className="h-4 w-4" />
              SAML Configuration
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ConfigRow label="IDP Entry Point" value={config?.entryPoint} mono />
          <ConfigRow label="SP Entity ID" value={config?.issuer} mono />
          <ConfigRow label="Callback URL" value={config?.callbackUrl} mono />
          <ConfigRow
            label="IDP Certificate"
            value={
              config?.hasCert ? (
                <Badge variant="success" className="text-xs">
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Not configured
                </Badge>
              )
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2 text-ink-500">
          <Settings className="h-4 w-4" />
          Edit Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {importSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {importSuccess}
          </div>
        )}

        {!showMetadataImport ? (
          <>
            <div className="flex items-center justify-between bg-surface-muted border border-hairline rounded-lg px-4 py-3 mb-5">
              <span className="text-sm text-ink-500">Import from SAML metadata</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetadataImport(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Import
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>SAML Entry Point (IDP SSO URL)</Label>
                <Input
                  name="entryPoint"
                  value={formData.entryPoint}
                  onChange={handleChange}
                  placeholder="https://your-curity-server.com/authn/authentication/saml"
                />
              </div>

              <div className="space-y-2">
                <Label>SP Entity ID (Issuer)</Label>
                <Input
                  name="issuer"
                  value={formData.issuer}
                  onChange={handleChange}
                  placeholder="urn:example:sp"
                />
              </div>

              <div className="space-y-2">
                <Label>Callback URL (Assertion Consumer Service)</Label>
                <Input
                  name="callbackUrl"
                  value={formData.callbackUrl}
                  onChange={handleChange}
                  placeholder="http://localhost:3001/saml/callback"
                />
              </div>

              <div className="space-y-2">
                <Label>IDP Certificate (Public Key)</Label>
                <Textarea
                  name="cert"
                  className="font-mono text-xs"
                  value={formData.cert}
                  onChange={handleChange}
                  placeholder="Paste the IDP's public certificate here (without BEGIN/END markers)"
                  rows={5}
                />
                <p className="text-xs text-ink-400">
                  Paste only the certificate content, without BEGIN/END markers
                </p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button type="submit">
                  <Save className="h-3.5 w-3.5" />
                  Save Configuration
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Metadata Type</Label>
              <div className="flex rounded-lg border border-hairline overflow-hidden w-fit">
                <MetadataTypeButton
                  type="idp"
                  current={metadataType}
                  onClick={setMetadataType}
                >
                  IDP Metadata
                </MetadataTypeButton>
                <MetadataTypeButton
                  type="sp"
                  current={metadataType}
                  onClick={setMetadataType}
                  className="border-l border-hairline"
                >
                  SP Metadata
                </MetadataTypeButton>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Paste SAML Metadata XML</Label>
              <Textarea
                className="font-mono text-xs"
                value={metadataInput}
                onChange={(e) => setMetadataInput(e.target.value)}
                placeholder='<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" ...>'
                rows={8}
              />
              {metadataType === 'idp' && (
                <p className="text-xs text-ink-400">
                  Get IDP metadata from: https://your-curity-server/saml/sso/metadata
                </p>
              )}
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleParseMetadata}>
                <Download className="h-3.5 w-3.5" />
                Parse & Import
              </Button>
              <Button variant="outline" onClick={() => setShowMetadataImport(false)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Manual Entry
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ConfigRowProps {
  label: string;
  value: string | undefined | null | ReactNode;
  mono?: boolean;
}

function ConfigRow({ label, value, mono = false }: ConfigRowProps) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-ink-500 shrink-0">{label}</span>
      {typeof value === 'string' || value == null ? (
        <span
          className={`text-sm text-right break-all ${
            mono ? 'font-mono text-xs text-ink-700' : 'text-ink-900'
          }`}
        >
          {value || 'Not configured'}
        </span>
      ) : (
        value
      )}
    </div>
  );
}

interface MetadataTypeButtonProps {
  type: MetadataType;
  current: MetadataType;
  onClick: (type: MetadataType) => void;
  children: ReactNode;
  className?: string;
}

function MetadataTypeButton({
  type,
  current,
  onClick,
  children,
  className = ''
}: MetadataTypeButtonProps) {
  const isActive = current === type;
  return (
    <button
      type="button"
      className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
        isActive ? 'bg-ink-900 text-white' : 'bg-white text-ink-500 hover:bg-surface-muted'
      } ${className}`}
      onClick={() => onClick(type)}
    >
      {children}
    </button>
  );
}

function isIdpMetadata(c: ParsedIdpMetadata | ParsedSpMetadata): c is ParsedIdpMetadata {
  return 'entryPoint' in c || 'cert' in c;
}

function isSpMetadata(c: ParsedIdpMetadata | ParsedSpMetadata): c is ParsedSpMetadata {
  return 'callbackUrl' in c;
}

export default ConfigPanel;
