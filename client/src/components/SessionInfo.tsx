import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Fingerprint, Hash } from 'lucide-react';
import type { SessionInfo as SessionInfoData } from '../types/api';

interface SessionInfoProps {
  session: SessionInfoData | null;
}

const CORE_FIELDS = new Set(['nameID', 'nameIDFormat', 'sessionIndex', 'issuer']);

function formatAttributeValue(value: unknown): { display: string; isObject: boolean } {
  if (Array.isArray(value)) return { display: value.join(', '), isObject: false };
  if (typeof value === 'object' && value !== null) {
    return { display: JSON.stringify(value, null, 2), isObject: true };
  }
  return { display: String(value), isObject: false };
}

function SessionInfo({ session }: SessionInfoProps) {
  if (!session?.authenticated || !session?.user) {
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-ink-500">
            <User className="h-4 w-4" />
            Session Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-muted border border-ink-50 p-6 text-center space-y-2">
            <p className="text-sm text-ink-500">No active session.</p>
            <p className="text-xs text-ink-400">
              Click <span className="font-medium text-ink-700">Sign In with SAML</span>{' '}
              above to authenticate against the IdP. Attributes and the session index
              will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { user } = session;
  const attributes = Object.entries(user).filter(([key]) => !CORE_FIELDS.has(key));

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2 text-ink-500">
          <User className="h-4 w-4" />
          Session Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {user.nameID && (
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-ink-500 flex items-center gap-1.5 shrink-0">
              <Fingerprint className="h-3.5 w-3.5" />
              Name ID
            </span>
            <span className="text-sm font-mono text-ink-900 text-right break-all">
              {user.nameID}
            </span>
          </div>
        )}

        {user.nameIDFormat && (
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-ink-500 shrink-0">Format</span>
            <span className="text-xs font-mono text-ink-500 text-right break-all">
              {user.nameIDFormat}
            </span>
          </div>
        )}

        {user.sessionIndex && (
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-ink-500 flex items-center gap-1.5 shrink-0">
              <Hash className="h-3.5 w-3.5" />
              Session Index
            </span>
            <span className="text-sm font-mono text-ink-900 text-right break-all">
              {user.sessionIndex}
            </span>
          </div>
        )}

        {attributes.length > 0 ? (
          <>
            <Separator className="my-3" />
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
              Attributes
            </p>
            <div className="space-y-2.5">
              {attributes.map(([key, value]) => {
                const { display, isObject } = formatAttributeValue(value);
                return (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <span className="text-sm text-ink-500 shrink-0">{key}</span>
                    <span
                      className={`text-sm text-right break-all ${
                        isObject
                          ? 'font-mono text-xs whitespace-pre-wrap text-ink-500'
                          : 'text-ink-900'
                      }`}
                    >
                      {display}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <Separator className="my-3" />
            <p className="text-xs text-ink-400">No additional attributes received</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SessionInfo;
