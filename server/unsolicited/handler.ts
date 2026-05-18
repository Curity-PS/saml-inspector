import { buildResponseXml } from './buildResponse';
import { signAssertion, signResponse } from './sign';
import { readKey, readCert } from './keys';
import { CookieJar, postSamlResponse, followAutoSubmitForm, extractCodeFromLocation, exchangeCodeForTokens, decodeIdToken, deriveTokenUrl } from './oauthChain';
import type { UnsolicitedDefaults, UnsolicitedHooks, UnsolicitedInput, UnsolicitedResult, UnsolicitedTraceEntry } from './types';

export function defaults(): UnsolicitedDefaults {
  return {
    acsUrl: process.env.UNSOLICITED_ACS_URL || 'https://localhost:8443/dev/authn/authenticate/saml2-sp',
    audience: process.env.UNSOLICITED_AUDIENCE || 'https://localhost:8443/dev/authn/anonymous/saml2-sp/metadata',
    idpEntityId: process.env.UNSOLICITED_IDP_ENTITY_ID || 'https://saml-idp.curity.local:9443/saml/sso/metadata',
    oauthProfileId: process.env.UNSOLICITED_OAUTH_PROFILE_ID || 'oauth-dev',
    resumePath: process.env.UNSOLICITED_RESUME_PATH || '/dev/oauth/authorize',
    nameId: process.env.UNSOLICITED_NAMEID || 'johndoe',
    clientId: process.env.UNSOLICITED_CLIENT_ID || 'saml2_unsolicited_client',
    clientSecret: process.env.UNSOLICITED_CLIENT_SECRET || 'saml2_unsolicited_client',
    redirectUri: process.env.UNSOLICITED_REDIRECT_URI || `http://localhost:${process.env.PORT || 3001}/api/unsolicited/callback`,
    responseType: 'code',
    scope: process.env.UNSOLICITED_SCOPE || 'openid',
    tokenUrl: process.env.UNSOLICITED_TOKEN_URL || null
  };
}

interface ResolvedParams {
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
  signAssertionFlag: boolean;
  signResponseFlag: boolean;
  tokenUrl: string | null;
}

function resolveParams(input: UnsolicitedInput): ResolvedParams {
  const d = defaults();
  return {
    acsUrl: input.acsUrl || d.acsUrl,
    audience: input.audience || d.audience,
    idpEntityId: input.idpEntityId || d.idpEntityId,
    oauthProfileId: input.oauthProfileId || d.oauthProfileId,
    resumePath: input.resumePath || d.resumePath,
    nameId: input.nameId || d.nameId,
    clientId: input.clientId || d.clientId,
    clientSecret: input.clientSecret || d.clientSecret,
    redirectUri: input.redirectUri || d.redirectUri,
    responseType: 'code',
    scope: input.scope || d.scope,
    signAssertionFlag: input.signAssertion !== false,
    signResponseFlag: input.signResponse !== false,
    tokenUrl: input.tokenUrl ?? d.tokenUrl
  };
}

export async function sendUnsolicited(input: UnsolicitedInput, { onSentXml }: UnsolicitedHooks = {}): Promise<UnsolicitedResult> {
  const params = resolveParams(input);
  const tokenUrl = params.tokenUrl || deriveTokenUrl(params.acsUrl, params.resumePath);
  const keyPem = readKey();
  const certPem = readCert();
  const trace: UnsolicitedTraceEntry[] = [];

  // ── Build + sign ──────────────────────────────────────────────────────
  const { xml: unsignedXml } = buildResponseXml({
    destination: params.acsUrl,
    idpEntityId: params.idpEntityId,
    audience: params.audience,
    nameId: params.nameId
  });

  // CLAUDE.md gotcha #3: assertion must be signed BEFORE the response —
  // the response signature has to cover the canonical, already-signed assertion.
  let xml = unsignedXml;
  if (params.signAssertionFlag) xml = signAssertion(xml, keyPem, certPem);
  if (params.signResponseFlag) xml = signResponse(xml, keyPem, certPem);

  const sentXml = xml;
  onSentXml?.(sentXml);

  const samlResponseB64 = Buffer.from(sentXml, 'utf8').toString('base64');
  const jar = new CookieJar();

  // ── Step 1: POST to ACS ───────────────────────────────────────────────
  let t0 = Date.now();
  const step1 = await postSamlResponse(
    {
      acsUrl: params.acsUrl,
      samlResponseB64,
      oauthProfileId: params.oauthProfileId,
      resumePath: params.resumePath,
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      responseType: params.responseType,
      scope: params.scope
    },
    jar
  );
  trace.push({ step: `POST ${pathOf(params.acsUrl)}`, status: step1.status, ms: Date.now() - t0 });

  if (step1.status !== 200 || !looksLikeAutoSubmitForm(step1.text)) {
    return {
      ok: false,
      failedStep: 1,
      failedStepName: 'POST SAMLResponse to ACS',
      status: step1.status,
      body: step1.text.slice(0, 4000),
      sentXml,
      samlResponseB64,
      trace
    };
  }

  // ── Step 2: follow auto-submit form → /dev/oauth/authorize ────────────
  t0 = Date.now();
  const step2 = await followAutoSubmitForm({ html: step1.text, acsUrl: params.acsUrl }, jar);
  trace.push({ step: `${step2.method} ${pathOf(step2.action)}`, status: step2.status, ms: Date.now() - t0 });

  if (step2.status !== 303 && step2.status !== 302) {
    return {
      ok: false,
      failedStep: 2,
      failedStepName: 'Follow auto-submit form',
      status: step2.status,
      body: step2.text.slice(0, 4000),
      sentXml,
      samlResponseB64,
      trace
    };
  }

  const codeInfo = extractCodeFromLocation(step2.location);
  if (!('code' in codeInfo)) {
    return {
      ok: false,
      failedStep: 2,
      failedStepName: 'Extract code from redirect',
      status: step2.status,
      body: `Location: ${step2.location}\n\n${JSON.stringify(codeInfo, null, 2)}`,
      sentXml,
      samlResponseB64,
      trace
    };
  }

  // ── Step 3: code → tokens ─────────────────────────────────────────────
  t0 = Date.now();
  const step3 = await exchangeCodeForTokens({
    tokenUrl,
    code: codeInfo.code,
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri
  });
  trace.push({ step: `POST ${pathOf(tokenUrl)}`, status: step3.status, ms: Date.now() - t0 });

  if (step3.status !== 200 || !step3.json) {
    return {
      ok: false,
      failedStep: 3,
      failedStepName: 'Exchange code for tokens',
      status: step3.status,
      body: step3.body.slice(0, 4000),
      sentXml,
      samlResponseB64,
      trace
    };
  }

  const tokens = step3.json;
  return {
    ok: true,
    tokens,
    decodedIdToken: decodeIdToken(tokens.id_token),
    sentXml,
    samlResponseB64,
    trace
  };
}

function looksLikeAutoSubmitForm(html: string): boolean {
  return /<form\b/i.test(html) && /<input\b/i.test(html);
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
