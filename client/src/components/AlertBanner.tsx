import { CheckCircle, X, XCircle } from 'lucide-react';

type AlertVariant = 'error' | 'success';

export interface AlertAction {
  label: string;
  onClick: () => void;
}

interface AlertBannerProps {
  variant: AlertVariant;
  message: string;
  onDismiss: () => void;
  /**
   * Optional inline action button shown before the dismiss X. Useful for
   * "View captured messages →" follow-ups after a flow completes. The
   * banner auto-dismisses after the action is clicked.
   */
  action?: AlertAction;
}

const STYLES = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    button: 'text-red-400 hover:text-red-600',
    actionLink: 'text-red-700 hover:text-red-900',
    Icon: XCircle
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    button: 'text-emerald-400 hover:text-emerald-600',
    actionLink: 'text-emerald-700 hover:text-emerald-900',
    Icon: CheckCircle
  }
} as const;

export function AlertBanner({ variant, message, onDismiss, action }: AlertBannerProps) {
  const { container, button, actionLink, Icon } = STYLES[variant];

  const handleAction = () => {
    action?.onClick();
    onDismiss();
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 ${container} border rounded-lg px-4 py-3 mb-5 text-sm animate-fade-in`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {action && (
          <button
            type="button"
            onClick={handleAction}
            className={`text-xs font-medium underline-offset-2 hover:underline cursor-pointer ${actionLink}`}
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className={`${button} cursor-pointer`}
          type="button"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
