import type {
  CapturedAssertion,
  CapturedRequest,
  CapturedResponse,
  MessageStoreState
} from '../types/domain';

/**
 * In-memory store of captured SAML messages.
 *
 * Diagnostic tool — process-local memory is the right scope.
 * Restart wipes the log by design.
 */
let messages: MessageStoreState = {
  requests: [],
  responses: [],
  assertions: []
};

export function getAll(): MessageStoreState {
  return messages;
}

export function clear(): void {
  messages = { requests: [], responses: [], assertions: [] };
}

export function recordRequest(entry: CapturedRequest): void {
  messages.requests.push(entry);
}

export function recordResponse(entry: CapturedResponse): void {
  messages.responses.push(entry);
}

export function recordAssertion(entry: CapturedAssertion): void {
  messages.assertions.push(entry);
}
