/**
 * Cross-module types for the server.
 * Single source of truth for the contract between bootstrap, state, routes,
 * and the SAML helpers.
 */

// ─── SAML strategy config ─────────────────────────────────────────────────

export type ValidateInResponseTo = 'always' | 'never';

export interface SamlStrategyConfig {
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  idpCert: string;
  wantAssertionsSigned: boolean;
  wantAuthnResponseSigned: boolean;
  validateInResponseTo: ValidateInResponseTo;
  requestIdExpirationPeriodMs: number;
  identifierFormat: string | null;
  acceptedClockSkewMs: number;
  disableRequestedAuthnContext: boolean;
  forceAuthn: boolean;
  skipRequestCompression: boolean;
  authnRequestBinding: 'HTTP-Redirect' | 'HTTP-POST';
  // SP signing material. Present only when signAuthnRequests is true —
  // passport-saml signs outbound AuthnRequest / LogoutRequest iff privateKey
  // is supplied. For HTTP-Redirect binding the signature is detached on the
  // URL (SigAlg + Signature query params), not embedded inside the XML.
  signAuthnRequests: boolean;
  privateKey?: string;
  publicCert?: string;
  signatureAlgorithm?: 'sha256' | 'sha512' | 'sha1';
  // @node-saml defaults the Reference digest to SHA-1 even when signing is
  // RSA-SHA256, which Curity rejects under "secure validation enabled". Must
  // be set explicitly to match the signatureAlgorithm.
  digestAlgorithm?: 'sha256' | 'sha512' | 'sha1';
}

export interface SamlConfigState {
  samlConfig: SamlStrategyConfig;
  isSamlConfigured: boolean;
  hasCert: boolean;
  skipCertValidation: boolean;
}

// ─── Metadata snapshots ───────────────────────────────────────────────────

export interface IdpConfigSnapshot {
  issuer?: string;
  entryPoint?: string;
  logoutUrl?: string;
  cert?: string;
}

export interface SpConfigSnapshot {
  issuer?: string;
  callbackUrl?: string;
  logoutCallbackUrl?: string;
}

// ─── Decoded SAML payload ─────────────────────────────────────────────────

export interface DecodedSamlSuccess {
  xml: string;
  json: unknown;
  prettified: string;
}

export interface DecodedSamlFailure {
  error: string;
  raw: string;
}

export type DecodedSaml = DecodedSamlSuccess | DecodedSamlFailure;

// ─── Captured messages store ──────────────────────────────────────────────

export interface CapturedRequest {
  timestamp: string;
  raw: string;
  decoded: DecodedSaml;
  // HTTP-Redirect binding params captured from the outbound URL. `signed` is
  // derived (sigAlg + signature both present). Surfacing these makes it
  // obvious in the Inspector whether the AuthnRequest was actually signed —
  // the XML alone can't tell you (signature is detached for this binding).
  signed: boolean;
  sigAlg?: string;
  signature?: string;
  relayState?: string;
}

export interface CapturedResponse {
  timestamp: string;
  raw: string;
  decoded: DecodedSaml | { xml: string; prettified: string };
  /** Set on entries created by the unsolicited flow. */
  source?: 'unsolicited';
  signed: boolean;
  /** True if the inner <Assertion> carries its own signature. */
  assertionSigned: boolean;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
}

export interface CapturedAssertion {
  timestamp: string;
  user: unknown;
  sessionIndex?: string;
}

export interface MessageStoreState {
  requests: CapturedRequest[];
  responses: CapturedResponse[];
  assertions: CapturedAssertion[];
}

// ─── HTTP utility ─────────────────────────────────────────────────────────

export type IdpReachability =
  | { reachable: true; statusCode: number | undefined }
  | { reachable: false; reason: 'not_configured' | 'timeout' | 'unreachable' };
