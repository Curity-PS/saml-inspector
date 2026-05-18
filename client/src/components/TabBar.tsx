import type { TabId } from '../hooks/useTab';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sp-initiated', label: 'SP-Initiated' },
  { id: 'unsolicited', label: 'Unsolicited' },
  { id: 'inspector', label: 'Inspector' }
];

interface TabBarProps {
  current: TabId;
  onChange: (next: TabId) => void;
  /** Total captured messages — surfaced as a badge on the Inspector tab. */
  messageCount: number;
}

export function TabBar({ current, onChange, messageCount }: TabBarProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-hairline sticky top-16 z-40">
      <nav
        className="max-w-5xl mx-auto px-6 flex gap-1 overflow-x-auto whitespace-nowrap custom-scrollbar"
        aria-label="Workflow tabs"
      >
        {TABS.map((tab) => {
          const active = current === tab.id;
          const count = tab.id === 'inspector' ? messageCount : undefined;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px shrink-0 focus:outline-none focus-visible:bg-brand-50/60 rounded-t-md ${
                active
                  ? 'border-brand-500 text-ink-800'
                  : 'border-transparent text-ink-400 hover:text-ink-800'
              }`}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] px-1 h-[18px] text-[10px] rounded-full transition-colors ${
                    active ? 'bg-brand-100 text-brand-800' : 'bg-ink-50 text-ink-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
