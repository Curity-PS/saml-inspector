import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Optional right-aligned content (badge, icon, copy button) inside the header. */
  right?: ReactNode;
}

/**
 * Bordered section with a clickable header that toggles content visibility.
 * Extracted from UnsolicitedPanel so HostCuritySetup, UnsolicitedResult and
 * ConfigDrawer can reuse the same affordance.
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  right = null
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-hairline rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-ink-800 hover:bg-surface-muted cursor-pointer transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-ink-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink-400" />
          )}
          {title}
        </span>
        {right}
      </button>
      {open && <div className="px-3 py-3 border-t border-hairline">{children}</div>}
    </div>
  );
}
