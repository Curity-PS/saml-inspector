import { URL, URLSearchParams } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import { CookieJar } from './http/cookieJar';
import { request } from './http/request';

export { CookieJar };

const silentDom = new DOMParser({
  errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} }
});

export interface PostSamlResponseParams {
  acsUrl: string;
  samlResponseB64: string;
  oauthProfileId: string;
  resumePath: string;
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
}

export interface PostSamlResponseResult {
  status: number;
  text: string;
  headers: Headers;
}

export async function postSamlResponse(
  params: PostSamlResponseParams,
  jar: CookieJar
): Promise<PostSamlResponseResult> {
  // NOTE (CLAUDE.md gotcha #1): these fields must live in the FORM BODY,
  // not the URL query. Curity's AuthenticationController gates the SAML2
  // dispatch on serviceProviderId/client_id being in the body.
  const form = new URLSearchParams({
    SAMLResponse: params.samlResponseB64,
    serviceProviderId: params.oauthProfileId,
    resumePath: params.resumePath,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: params.responseType,
    scope: params.scope
  });
  const res = await request(params.acsUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    jar
  });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

interface ParsedForm {
  action: string;
  method: 'GET' | 'POST';
  inputs: Record<string, string>;
}

export function parseAutoSubmitForm(html: string): ParsedForm | null {
  const dom = silentDom.parseFromString(html, 'text/html');
  const forms = dom.getElementsByTagName('form');
  if (!forms.length) return null;
  const form = forms[0];
  if (!form) return null;

  const action = form.getAttribute('action') ?? '';
  const rawMethod = (form.getAttribute('method') ?? 'GET').toUpperCase();
  const method: 'GET' | 'POST' = rawMethod === 'POST' ? 'POST' : 'GET';
  const inputs: Record<string, string> = {};
  const inputEls = form.getElementsByTagName('input');
  for (let i = 0; i < inputEls.length; i++) {
    const inp = inputEls[i];
    if (!inp) continue;
    const name = inp.getAttribute('name');
    if (!name) continue;
    inputs[name] = inp.getAttribute('value') ?? '';
  }
  return { action, method, inputs };
}

export interface FollowFormResult {
  status: number;
  location: string | null;
  text: string;
  method: 'GET' | 'POST';
  action: string;
}

export async function followAutoSubmitForm(
  { html, acsUrl }: { html: string; acsUrl: string },
  jar: CookieJar
): Promise<FollowFormResult> {
  const form = parseAutoSubmitForm(html);
  if (!form) {
    const err = new Error('No form found in Curity response body') as Error & { snippet?: string };
    err.snippet = html.slice(0, 600);
    throw err;
  }
  const fullAction = form.action.startsWith('/')
    ? new URL(form.action, acsUrl).toString()
    : form.action;

  let res: Response;
  if (form.method === 'POST') {
    const body = new URLSearchParams(form.inputs).toString();
    res = await request(fullAction, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      jar
    });
  } else {
    const u = new URL(fullAction);
    for (const [k, v] of Object.entries(form.inputs)) u.searchParams.append(k, v);
    res = await request(u.toString(), { method: 'GET', jar });
  }

  const location = res.headers.get('location');
  const text = location ? '' : await res.text();
  return { status: res.status, location, text, method: form.method, action: fullAction };
}

export type CodeExtraction =
  | { code: string; state: string | null }
  | { error: string; errorDescription?: string | null; queryString?: string };

export function extractCodeFromLocation(location: string | null): CodeExtraction {
  if (!location) return { error: 'no_location' };
  const u = new URL(location);
  const code = u.searchParams.get('code');
  if (code) return { code, state: u.searchParams.get('state') };
  const error = u.searchParams.get('error');
  if (error) return { error, errorDescription: u.searchParams.get('error_description') };
  return { error: 'no_code', queryString: u.search };
}

export interface TokenExchangeParams {
  tokenUrl: string;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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

export interface TokenExchangeResult {
  status: number;
  body: string;
  json: TokenResponse | null;
}

export async function exchangeCodeForTokens(
  params: TokenExchangeParams
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri
  }).toString();
  const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
  const res = await request(params.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basic}`
    },
    body
  });
  const text = await res.text();
  let json: TokenResponse | null = null;
  try {
    json = JSON.parse(text) as TokenResponse;
  } catch {
    // non-JSON body — leave json null for the caller to inspect via `body`.
  }
  return { status: res.status, body: text, json };
}

export interface DecodedIdToken {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

export function decodeIdToken(idToken: string | undefined): DecodedIdToken | null {
  if (!idToken || typeof idToken !== 'string' || idToken.split('.').length !== 3) {
    return null;
  }
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64url').toString('utf8')) as DecodedIdToken;
  } catch {
    return null;
  }
}

export function deriveTokenUrl(acsUrl: string, resumePath: string | null | undefined): string {
  const u = new URL(acsUrl);
  const tokenPath = (resumePath || '/dev/oauth/authorize').replace(/authorize$/, 'token');
  return `${u.protocol}//${u.host}${tokenPath}`;
}
