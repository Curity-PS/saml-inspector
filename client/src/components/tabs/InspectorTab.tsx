import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import MessageViewer from '../MessageViewer';
import type {
  CapturedAssertion,
  CapturedRequest,
  CapturedResponse,
  MessageStore
} from '../../types/api';

interface InspectorTabProps {
  messages: MessageStore;
  onClear: () => void;
  onRefresh: () => void;
}

type FlowFilter = 'all' | 'sp-initiated' | 'unsolicited';

const FILTERS: Array<{ id: FlowFilter; label: string }> = [
  { id: 'all', label: 'All flows' },
  { id: 'sp-initiated', label: 'SP-Initiated' },
  { id: 'unsolicited', label: 'Unsolicited' }
];

/**
 * Inspector tab. Wraps MessageViewer with a flow filter so users can scope
 * the captured-messages list to just SP-Initiated or just Unsolicited.
 *
 * The filter operates on `source` (currently set on response entries only;
 * see server/routes/unsolicited.ts). Requests and assertions carry no
 * source field, so they only appear under "All" or "SP-Initiated".
 */
export function InspectorTab({ messages, onClear, onRefresh }: InspectorTabProps) {
  const [filter, setFilter] = useState<FlowFilter>('all');

  const filtered = useMemo<MessageStore>(() => {
    if (filter === 'all') return messages;

    if (filter === 'unsolicited') {
      return {
        requests: [], // requests carry no source — none are unsolicited
        responses: messages.responses.filter((r) => r.source === 'unsolicited'),
        assertions: [] // assertions are SP-Initiated by construction
      };
    }

    // sp-initiated
    return {
      requests: messages.requests,
      responses: messages.responses.filter((r) => r.source !== 'unsolicited'),
      assertions: messages.assertions
    };
  }, [messages, filter]);

  return (
    <section className="space-y-3">
      <FlowFilterBar current={filter} onChange={setFilter} />
      <MessageViewer messages={filtered} onClear={onClear} onRefresh={onRefresh} />
    </section>
  );
}

interface FlowFilterBarProps {
  current: FlowFilter;
  onChange: (next: FlowFilter) => void;
}

function FlowFilterBar({ current, onChange }: FlowFilterBarProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Filter className="h-3.5 w-3.5 text-ink-400" />
      <span className="text-ink-500">Filter:</span>
      <div className="flex rounded-md border border-hairline overflow-hidden">
        {FILTERS.map((f) => {
          const active = current === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-ink-900 text-white'
                  : 'bg-white text-ink-500 hover:bg-surface-muted'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Re-export so MessageViewer's source badge can reuse the same shape if needed.
export type { CapturedRequest, CapturedResponse, CapturedAssertion };
