import { Check } from 'lucide-react';

export type StepState = 'pending' | 'active' | 'complete' | 'failed';

export interface Step {
  label: string;
  state: StepState;
}

interface FlowStepperProps {
  steps: Step[];
}

/**
 * Horizontal step indicator. Used on the Unsolicited result to visualize
 * the 3-step flow (Build & sign → POST → Token exchange).
 *
 * Step state is derived from the result shape, not tracked separately:
 *   result.ok                 → all 3 complete
 *   result.ok=false, step=N   → step 0..N-2 complete, N-1 failed, rest pending
 */
export function FlowStepper({ steps }: FlowStepperProps) {
  return (
    <ol className="flex items-center gap-2 text-xs flex-wrap">
      {steps.map((step, idx) => (
        <li key={`${idx}-${step.label}`} className="flex items-center gap-2">
          <StepDot state={step.state} index={idx + 1} />
          <span className={stepLabelClass(step.state)}>{step.label}</span>
          {idx < steps.length - 1 && (
            <span className={`w-6 h-px ${connectorClass(step.state)}`} aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

interface StepDotProps {
  state: StepState;
  index: number;
}

function StepDot({ state, index }: StepDotProps) {
  const base = 'inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold';
  if (state === 'complete') {
    return (
      <span className={`${base} bg-emerald-500 text-white`} aria-label="complete">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className={`${base} bg-red-500 text-white`} aria-label="failed">
        !
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className={`${base} bg-ink-900 text-white`} aria-current="step">
        {index}
      </span>
    );
  }
  return (
    <span className={`${base} bg-hairline text-ink-500`} aria-label="pending">
      {index}
    </span>
  );
}

function stepLabelClass(state: StepState): string {
  if (state === 'pending') return 'text-ink-400';
  if (state === 'failed') return 'text-red-700 font-medium';
  return 'text-ink-700 font-medium';
}

function connectorClass(state: StepState): string {
  return state === 'complete' ? 'bg-emerald-500' : 'bg-ink-200';
}
