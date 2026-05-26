import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACEHOLDER_CERT } from './samlConfig';

/**
 * `buildSamlConfig` reads env vars *at call time* and also imports from
 * ./env (which reads env vars at module-load time). We use vi.resetModules()
 * between scenarios so ./env is re-evaluated with the per-test environment.
 */

const REAL_CERT = 'A'.repeat(120); // > 50 chars triggers hasCert=true

interface EnvOverrides {
  SAML_IDP_ENTRY_POINT?: string;
  SAML_IDP_CERT?: string;
  SAML_IDP_SKIP_CERT_VALIDATION?: string;
  SAML_SP_ISSUER?: string;
  SAML_SP_CALLBACK_URL?: string;
  PORT?: string;
}

async function buildWithEnv(env: EnvOverrides, signAuthnRequests = false) {
  // Snapshot and replace, then reset modules so config/env.ts re-evaluates.
  const previous = { ...process.env };
  for (const key of Object.keys(env) as Array<keyof EnvOverrides>) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  const mod = await import('./samlConfig');
  // Pass signAuthnRequests explicitly so tests are deterministic regardless
  // of any persisted .runtime-config.json or env vars on the dev machine.
  const result = mod.buildSamlConfig(signAuthnRequests);
  process.env = previous;
  return result;
}

describe('buildSamlConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear SAML-related vars so the test cases start from a known floor.
    delete process.env.SAML_IDP_ENTRY_POINT;
    delete process.env.SAML_IDP_CERT;
    delete process.env.SAML_IDP_SKIP_CERT_VALIDATION;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports isSamlConfigured=true with entry point + real cert', async () => {
    const state = await buildWithEnv({
      SAML_IDP_ENTRY_POINT: 'https://idp/sso',
      SAML_IDP_CERT: REAL_CERT
    });
    expect(state.isSamlConfigured).toBe(true);
    expect(state.hasCert).toBe(true);
    expect(state.samlConfig.entryPoint).toBe('https://idp/sso');
    expect(state.samlConfig.idpCert).toBe(REAL_CERT);
    expect(state.samlConfig.wantAssertionsSigned).toBe(true);
    expect(state.samlConfig.wantAuthnResponseSigned).toBe(true);
    expect(state.samlConfig.validateInResponseTo).toBe('always');
  });

  it('reports isSamlConfigured=true with entry point + skipCertValidation, and falls back to PLACEHOLDER_CERT', async () => {
    const state = await buildWithEnv({
      SAML_IDP_ENTRY_POINT: 'https://idp/sso',
      SAML_IDP_SKIP_CERT_VALIDATION: 'true'
    });
    expect(state.isSamlConfigured).toBe(true);
    expect(state.hasCert).toBe(false);
    expect(state.skipCertValidation).toBe(true);
    expect(state.samlConfig.idpCert).toBe(PLACEHOLDER_CERT);
    expect(state.samlConfig.wantAssertionsSigned).toBe(false);
    expect(state.samlConfig.wantAuthnResponseSigned).toBe(false);
    expect(state.samlConfig.validateInResponseTo).toBe('never');
  });

  it('reports isSamlConfigured=false when entry point is missing', async () => {
    const state = await buildWithEnv({});
    expect(state.isSamlConfigured).toBe(false);
    expect(state.samlConfig.entryPoint).toContain('not-configured.example.com');
  });

  it('reports isSamlConfigured=false when entry point is present but cert is too short and skip is off', async () => {
    const state = await buildWithEnv({
      SAML_IDP_ENTRY_POINT: 'https://idp/sso',
      SAML_IDP_CERT: 'short' // < 50 chars
    });
    expect(state.isSamlConfigured).toBe(false);
    expect(state.hasCert).toBe(false);
  });

  it('returns sensible static strategy options', async () => {
    const state = await buildWithEnv({
      SAML_IDP_ENTRY_POINT: 'https://idp/sso',
      SAML_IDP_CERT: REAL_CERT
    });
    expect(state.samlConfig.authnRequestBinding).toBe('HTTP-Redirect');
    expect(state.samlConfig.acceptedClockSkewMs).toBe(-1);
    expect(state.samlConfig.disableRequestedAuthnContext).toBe(true);
    expect(state.samlConfig.requestIdExpirationPeriodMs).toBe(28_800_000);
  });

  // Curity's IdP only validates AuthnRequest signatures embedded inside the
  // XML — so signing must force HTTP-POST binding. Locking this in protects
  // a hard-won debugging insight from accidental regression.
  it('switches binding to HTTP-POST when signAuthnRequests=true', async () => {
    const state = await buildWithEnv(
      { SAML_IDP_ENTRY_POINT: 'https://idp/sso', SAML_IDP_CERT: REAL_CERT },
      true
    );
    expect(state.samlConfig.signAuthnRequests).toBe(true);
    expect(state.samlConfig.authnRequestBinding).toBe('HTTP-POST');
  });
});
