import { useState, type ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Send,
  Inbox,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Check,
  Copy
} from 'lucide-react';
import { decodeMessage } from '../api/messages';
import type {
  CapturedAssertion,
  CapturedRequest,
  CapturedResponse,
  DecodedMessage,
  MessageStore
} from '../types/api';

interface MessageViewerProps {
  messages: MessageStore;
  onClear: () => void;
  onRefresh: () => void;
}

function MessageViewer({ messages, onClear, onRefresh }: MessageViewerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [decodeInput, setDecodeInput] = useState('');
  const [decodedResult, setDecodedResult] = useState<DecodedMessage | null>(null);

  const handleDecode = async () => {
    if (!decodeInput.trim()) return;
    try {
      const data = await decodeMessage(decodeInput, true);
      setDecodedResult(data);
    } catch {
      setDecodedResult({ error: 'Failed to decode message', raw: decodeInput });
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-ink-500">
            <Inbox className="h-4 w-4" />
            SAML Messages
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={onClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="requests" onValueChange={() => setExpandedIndex(null)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="requests" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Requests
              <CountBadge count={messages.requests?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="responses" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" />
              Responses
              <CountBadge count={messages.responses?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="assertions" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Assertions
              <CountBadge count={messages.assertions?.length ?? 0} />
            </TabsTrigger>
            <TabsTrigger value="decoder" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Decoder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <MessageList
              items={messages.requests}
              labelPrefix="SAML Request"
              emptyText="No SAML requests captured yet. Run the SP-Initiated flow to capture an AuthnRequest."
              expandedIndex={expandedIndex}
              onToggle={toggleExpand}
            />
          </TabsContent>

          <TabsContent value="responses">
            <MessageList
              items={messages.responses}
              labelPrefix="SAML Response"
              emptyText="No SAML responses captured yet. Sign in (SP-Initiated) or click Send (Unsolicited) to capture one."
              expandedIndex={expandedIndex}
              onToggle={toggleExpand}
            />
          </TabsContent>

          <TabsContent value="assertions">
            <AssertionList
              items={messages.assertions}
              expandedIndex={expandedIndex}
              onToggle={toggleExpand}
            />
          </TabsContent>

          <TabsContent value="decoder">
            <DecoderTab
              input={decodeInput}
              onInputChange={setDecodeInput}
              result={decodedResult}
              onDecode={handleDecode}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── XML rendering ───────────────────────────────────────────────────────

function formatXml(xml: string): string {
  const TAB = '    ';
  let formatted = '';
  let indent = 0;
  const parts = xml.split(/(<[^>]+>)/g).filter((part) => part.trim());

  parts.forEach((part) => {
    if (!part.startsWith('<')) {
      const trimmed = part.trim();
      if (trimmed) formatted += TAB.repeat(indent) + trimmed + '\n';
    } else if (part.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += TAB.repeat(indent) + part + '\n';
    } else {
      formatted += TAB.repeat(indent) + part + '\n';
      if (!part.endsWith('/>')) indent++;
    }
  });
  return formatted.trim();
}

function renderXmlLine(line: string, lineIndex: number): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = line;
  let key = 0;
  const tagRegex = /(<\/?)([a-zA-Z][\w:-]*)(\s[^>]*?)?(\/?>)/;

  while (remaining) {
    const match = remaining.match(tagRegex);
    if (!match) {
      if (remaining.trim()) {
        parts.push(
          <span key={`${lineIndex}-${key++}`} className="xml-text">
            {remaining}
          </span>
        );
      }
      break;
    }

    if (match.index! > 0) {
      parts.push(
        <span key={`${lineIndex}-${key++}`} className="xml-text">
          {remaining.substring(0, match.index)}
        </span>
      );
    }

    const [fullMatch, openBracket, tagName, attributes, closeBracket] = match;

    parts.push(
      <span key={`${lineIndex}-${key++}`}>
        <span className="xml-bracket">{openBracket}</span>
        <span className="xml-tag">{tagName}</span>
      </span>
    );

    if (attributes) {
      // Using matchAll for a cleaner iteration than the legacy stateful regex.
      const attrRegex = /(\s+)([a-zA-Z][\w:-]*)="([^"]*)"/g;
      let lastIndex = 0;
      for (const attrMatch of attributes.matchAll(attrRegex)) {
        const matchStart = attrMatch.index ?? 0;
        if (matchStart > lastIndex) {
          parts.push(
            <span key={`${lineIndex}-${key++}`}>
              {attributes.substring(lastIndex, matchStart)}
            </span>
          );
        }
        const [, space, attrName, attrValue] = attrMatch;
        parts.push(<span key={`${lineIndex}-${key++}`}>{space}</span>);
        parts.push(
          <span key={`${lineIndex}-${key++}`} className="xml-attr">
            {attrName}
          </span>
        );
        parts.push(
          <span key={`${lineIndex}-${key++}`} className="xml-bracket">
            ="
          </span>
        );
        parts.push(
          <span key={`${lineIndex}-${key++}`} className="xml-value">
            {attrValue}
          </span>
        );
        parts.push(
          <span key={`${lineIndex}-${key++}`} className="xml-bracket">
            "
          </span>
        );
        lastIndex = matchStart + attrMatch[0].length;
      }
      if (lastIndex < attributes.length) {
        parts.push(
          <span key={`${lineIndex}-${key++}`}>{attributes.substring(lastIndex)}</span>
        );
      }
    }

    parts.push(
      <span key={`${lineIndex}-${key++}`} className="xml-bracket">
        {closeBracket}
      </span>
    );
    remaining = remaining.substring(match.index! + fullMatch.length);
  }

  return <div key={lineIndex}>{parts}</div>;
}

function XmlBlock({ xml }: { xml: string | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!xml) return <div className="text-ink-400 p-4 text-sm">No XML content</div>;
  const formatted = formatXml(xml);
  const lines = formatted.split('\n');
  const handleCopy = () => {
    void navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="relative">
      {/* Dark-surface copy button — placed in the top-right of the XML
          panel, the standard placement for code-viewer copy controls.
          Styled with translucent white instead of the light-surface ghost
          variant so it reads cleanly against the ink-900 background. */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy XML to clipboard"
        className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-ink-200 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      {/* pr-20 leaves space so the rightmost characters in the XML never
          slide under the copy button on narrow viewports. */}
      <pre className="bg-ink-900 text-ink-200 p-4 pr-20 rounded-lg overflow-x-auto text-[13px] leading-relaxed font-mono custom-scrollbar">
        {lines.map((line, idx) => renderXmlLine(line, idx))}
      </pre>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function CountBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
      {count}
    </Badge>
  );
}

interface MessageListProps {
  items: Array<CapturedRequest | CapturedResponse> | undefined;
  labelPrefix: string;
  emptyText: string;
  expandedIndex: number | null;
  onToggle: (index: number) => void;
}

function MessageList({
  items,
  labelPrefix,
  emptyText,
  expandedIndex,
  onToggle
}: MessageListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg bg-surface-muted border border-ink-50 p-8 text-center">
        <p className="text-sm text-ink-400">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((msg, index) => {
        const isUnsolicited =
          'source' in msg && (msg as CapturedResponse).source === 'unsolicited';
        return (
          <div key={index} className="border border-hairline rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-ink-50 transition-colors cursor-pointer"
              onClick={() => onToggle(index)}
              type="button"
            >
              <span className="text-sm font-medium text-ink-800 flex items-center gap-2">
                {labelPrefix} #{index + 1}
                {isUnsolicited ? (
                  <Badge variant="warning" className="text-[10px] py-0">
                    Unsolicited
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    SP-Initiated
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-ink-400">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
                {expandedIndex === index ? (
                  <ChevronDown className="h-4 w-4 text-ink-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                )}
              </div>
            </button>

            {expandedIndex === index && (
              <div className="p-4 animate-fade-in">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
                  {labelPrefix} XML
                </p>
                <XmlBlock xml={msg.decoded?.xml ?? msg.decoded?.prettified} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AssertionListProps {
  items: CapturedAssertion[] | undefined;
  expandedIndex: number | null;
  onToggle: (index: number) => void;
}

function AssertionList({ items, expandedIndex, onToggle }: AssertionListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg bg-surface-muted border border-ink-50 p-8 text-center">
        <p className="text-sm text-ink-400">
          No SAML assertions captured yet. Complete a successful SP-Initiated sign-in to
          see the parsed user attributes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((assertion, index) => (
        <div key={index} className="border border-hairline rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-ink-50 transition-colors cursor-pointer"
            onClick={() => onToggle(index)}
            type="button"
          >
            <span className="text-sm font-medium text-ink-800 flex items-center gap-2">
              Assertion #{index + 1}
              <Badge variant="secondary" className="text-[10px] py-0">
                SP-Initiated
              </Badge>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-ink-400">
                {new Date(assertion.timestamp).toLocaleString()}
              </span>
              {expandedIndex === index ? (
                <ChevronDown className="h-4 w-4 text-ink-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-ink-400" />
              )}
            </div>
          </button>

          {expandedIndex === index && (
            <div className="p-4 animate-fade-in">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
                User Attributes
              </p>
              <pre className="bg-ink-900 text-ink-200 p-4 rounded-lg overflow-x-auto text-[13px] leading-relaxed font-mono custom-scrollbar">
                {Object.entries(assertion.user ?? {}).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="xml-attr">{key}</span>
                    <span className="xml-bracket">: </span>
                    <span className="xml-value">
                      {typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </span>
                  </div>
                ))}
                {assertion.sessionIndex && (
                  <div className="mt-3 pt-3 border-t border-ink-700">
                    <span className="xml-attr">Session Index</span>
                    <span className="xml-bracket">: </span>
                    <span className="xml-value">{assertion.sessionIndex}</span>
                  </div>
                )}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface DecoderTabProps {
  input: string;
  onInputChange: (value: string) => void;
  result: DecodedMessage | null;
  onDecode: () => void;
}

function DecoderTab({ input, onInputChange, result, onDecode }: DecoderTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-muted border border-hairline rounded-lg px-4 py-3">
        <p className="text-sm text-ink-500">
          Paste a Base64-encoded SAML message to decode and view its contents.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Base64 Encoded SAML Message</Label>
        <Textarea
          className="font-mono text-xs"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Paste your Base64 encoded SAML request or response here..."
          rows={4}
        />
      </div>

      <Button onClick={onDecode} disabled={!input.trim()}>
        <KeyRound className="h-3.5 w-3.5" />
        Decode Message
      </Button>

      {result && (
        <div className="space-y-3">
          <Separator />
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
            Decoded Result
          </p>
          {'error' in result ? (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {result.error}
            </div>
          ) : (
            <XmlBlock xml={result.prettified} />
          )}
        </div>
      )}
    </div>
  );
}

export default MessageViewer;
