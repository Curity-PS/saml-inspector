import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, RefreshCw, FileText } from 'lucide-react';
import type { SessionInfo } from '../types/api';

interface DashboardProps {
  session: SessionInfo | null;
  onLogin: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

function Dashboard({ session, onLogin, onLogout, onRefresh }: DashboardProps) {
  const authenticated = !!session?.authenticated;

  return (
    <Card className="mb-6 animate-slide-up">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full transition-all ${
                authenticated
                  ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]'
                  : 'bg-ink-200'
              }`}
            />
            <Badge
              variant={authenticated ? 'success' : 'secondary'}
              className="text-sm px-3 py-1"
            >
              {authenticated ? 'Authenticated' : 'Not Authenticated'}
            </Badge>
          </div>

          {!authenticated ? (
            <Button size="lg" onClick={onLogin} className="px-8">
              <LogIn className="h-4 w-4" />
              Sign In with SAML
            </Button>
          ) : (
            <Button variant="outline" size="lg" onClick={onLogout} className="px-8">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-hairline w-full justify-center">
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <a href="/saml/metadata" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" asChild>
                <span>
                  <FileText className="h-3.5 w-3.5" />
                  SP Metadata
                </span>
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
