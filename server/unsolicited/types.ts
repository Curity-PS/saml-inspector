import type { DecodedIdToken, TokenResponse } from './oauthChain';

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
  tokenUrl?: string | null;
  /** Default true; set false to demo missing-assertion-signature behavior */
  signAssertion?: boolean;
  /** Default true; set false to demo missing-response-signature behavior */
  signResponse?: boolean;
}

export interface UnsolicitedDefaults {
  acsUrl: string;
  audience: string;
  idpEntityId: string;
  oauthProfileId: string;
  resumePath: string;
  nameId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  responseType: 'code';
  scope: string;
  tokenUrl: string | null;
}

export interface UnsolicitedTraceEntry {
  step: string;
  status: number;
  ms: number;
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
  sentXml: string;
  samlResponseB64: string;
  trace: UnsolicitedTraceEntry[];
}

export type UnsolicitedResult = UnsolicitedSuccess | UnsolicitedFailure;

export interface UnsolicitedHooks {
  /** Called with the signed Response XML right before it's POSTed. */
  onSentXml?: (xml: string) => void;
}
