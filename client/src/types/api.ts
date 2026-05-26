/**
 * Client-side mirror of the server payload shapes.
 * Kept in sync by hand — the codebase is small and a shared types package
 * would be more ceremony than this size justifies.
 */

// ─── /api/session ─────────────────────────────────────────────────────────

export interface SamlUser {
  nameID?: string;
  nameIDFormat?: string;
  sessionIndex?: string;
  issuer?: string;
  [attribute: string]: unknown;
}

export interface SessionInfo {
  authenticated: boolean;
  user: SamlUser | null;
}

// ─── /api/config ──────────────────────────────────────────────────────────

export interface SamlConfigSnapshot {
  entryPoint?: string;
  issuer?: string;
  callbackUrl?: string;
  hasCert: boolean;
  identifierFormat: string | null;
  signAuthnRequests: boolean;
}

export interface ConfigUpdate {
  entryPoint?: string;
  issuer?: string;
  callbackUrl?: string;
  cert?: string;
  signAuthnRequests?: boolean;
}

// ─── /api/parse-metadata ──────────────────────────────────────────────────

export type MetadataType = 'idp' | 'sp';

export interface ParsedIdpMetadata {
  issuer?: string;
  entryPoint?: string;
  logoutUrl?: string;
  cert?: string;
}

export interface ParsedSpMetadata {
  issuer?: string;
  callbackUrl?: string;
  logoutCallbackUrl?: string;
}

export interface ParseMetadataResponse {
  success: boolean;
  config: ParsedIdpMetadata | ParsedSpMetadata;
}

// ─── /api/messages ────────────────────────────────────────────────────────

export interface DecodedSamlContent {
  xml?: string;
  json?: unknown;
  prettified?: string;
  error?: string;
  raw?: string;
}

export interface CapturedRequest {
  timestamp: string;
  raw: string;
  decoded: DecodedSamlContent;
  signed: boolean;
  sigAlg?: string;
  signature?: string;
  relayState?: string;
}

export interface CapturedResponse {
  timestamp: string;
  raw: string;
  decoded: DecodedSamlContent;
  source?: 'unsolicited';
  signed: boolean;
  assertionSigned: boolean;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
}

export interface CapturedAssertion {
  timestamp: string;
  user: SamlUser;
  sessionIndex?: string;
}

export interface MessageStore {
  requests: CapturedRequest[];
  responses: CapturedResponse[];
  assertions: CapturedAssertion[];
}

// ─── /api/decode ──────────────────────────────────────────────────────────

export type DecodedMessage =
  | { xml: string; json: unknown; prettified: string }
  | { error: string; raw: string };

// ─── /api/idp-status ──────────────────────────────────────────────────────

export type IdpReachability =
  | { reachable: true; statusCode?: number }
  | { reachable: false; reason: 'not_configured' | 'timeout' | 'unreachable' };

// ─── /api/unsolicited/* ───────────────────────────────────────────────────

export interface UnsolicitedDefaults {
  acsUrl: string;
  audience: string;
  idpEntityId: string;
  nameId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

export interface UnsolicitedInput {
  acsUrl?: string;
  audience?: string;
  idpEntityId?: string;
  oauthProfileId?: string;
  resumePath?: string;
  nameId?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string;
  signAssertion?: boolean;
  signResponse?: boolean;
}

export interface UnsolicitedTraceEntry {
  step: string;
  status: number;
  ms: number;
}

export interface TokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  [key: string]: unknown;
}

export interface DecodedIdToken {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

export interface UnsolicitedSuccess {
  ok: true;
  tokens: TokenResponse;
  decodedIdToken: DecodedIdToken | null;
  sentXml: string;
  samlResponseB64: string;
  trace: UnsolicitedTraceEntry[];
}

export interface UnsolicitedFailure {
  ok: false;
  failedStep: 1 | 2 | 3;
  failedStepName: string;
  status: number;
  body: string;
  sentXml?: string;
  samlResponseB64?: string;
  trace?: UnsolicitedTraceEntry[];
  error?: string;
  stack?: string;
}

export type UnsolicitedResult = UnsolicitedSuccess | UnsolicitedFailure;
