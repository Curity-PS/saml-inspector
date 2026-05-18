import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  value: unknown;
  label?: string;
}

/**
 * Small button that copies a value to the clipboard and flashes a "Copied"
 * confirmation for ~1.2 seconds. Extracted from UnsolicitedPanel so the
 * setup checklist and host-Curity setup can share it.
 */
export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    if (value == null) return;
    void navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
