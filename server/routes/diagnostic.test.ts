import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

/**
 * Integration tests for /api/* routes. Boots a real Express app, with a
 * registered SAML config so /api/health reports `configured:true`.
 *
 * The createApp() function is side-effect free, but state.ts holds the
 * SAML config in module-scope. We populate it before mounting routes.
 */

let app: Express;

async function setup() {
  // Minimal env so buildSamlConfig() reports configured=true via cert-skip.
  process.env.SAML_IDP_ENTRY_POINT = 'https://idp.test/sso';
  process.env.SAML_IDP_SKIP_CERT_VALIDATION = 'true';

  // Fresh module graph per test boot so state is clean.
  const { createApp } = await import('../app');
  const state = await import('../state');
  const { buildSamlConfig } = await import('../config/samlConfig');
  const { registerSamlStrategy } = await import('../saml/strategy');

  const cfg = buildSamlConfig();
  state.setSamlConfig(cfg.samlConfig, cfg.isSamlConfigured);
  registerSamlStrategy(cfg);

  return createApp();
}

beforeAll(async () => {
  app = await setup();
});

describe('GET /api/health', () => {
  it('returns 200 with `configured:true` and the strategy config snapshot', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      configured: true,
      config: {
        entryPoint: 'https://idp.test/sso',
        hasCert: true // placeholder cert is set when skipCertValidation=true
      }
    });
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});

describe('GET /api/session', () => {
  it('returns authenticated=false when no login has happened', async () => {
    const res = await request(app).get('/api/session').expect(200);
    expect(res.body).toEqual({ authenticated: false, user: null });
  });
});

describe('GET /api/config', () => {
  it('returns the configured SAML snapshot', async () => {
    const res = await request(app).get('/api/config').expect(200);
    expect(res.body.entryPoint).toBe('https://idp.test/sso');
    // The placeholder cert is in place but hasCert should be false (it IS
    // the placeholder, which the route filters out).
    expect(res.body.hasCert).toBe(false);
  });
});

describe('POST /api/config', () => {
  it('updates entryPoint at runtime', async () => {
    await request(app)
      .post('/api/config')
      .send({ entryPoint: 'https://new-idp.test/sso' })
      .expect(200);

    const after = await request(app).get('/api/config').expect(200);
    expect(after.body.entryPoint).toBe('https://new-idp.test/sso');

    // Restore for subsequent tests.
    await request(app)
      .post('/api/config')
      .send({ entryPoint: 'https://idp.test/sso' })
      .expect(200);
  });
});

describe('/api/messages', () => {
  it('returns an empty store initially', async () => {
    const res = await request(app).get('/api/messages').expect(200);
    expect(res.body).toEqual({ requests: [], responses: [], assertions: [] });
  });

  it('DELETE returns success and leaves the store empty', async () => {
    await request(app).delete('/api/messages').expect(200, { success: true });
    const res = await request(app).get('/api/messages').expect(200);
    expect(res.body).toEqual({ requests: [], responses: [], assertions: [] });
  });
});

describe('POST /api/decode', () => {
  it('decodes a base64-encoded SAML payload', async () => {
    const xml = '<saml:Response xmlns:saml="x"/>';
    const b64 = Buffer.from(xml).toString('base64');
    const res = await request(app)
      .post('/api/decode')
      .send({ message: b64, isEncoded: true })
      .expect(200);
    expect(res.body.xml).toBe(xml);
  });

  it('returns 400 when no message is supplied', async () => {
    await request(app)
      .post('/api/decode')
      .send({})
      .expect(400, { error: 'No message provided' });
  });
});

describe('POST /api/parse-metadata', () => {
  it('returns 400 when metadata is missing', async () => {
    await request(app)
      .post('/api/parse-metadata')
      .send({ type: 'idp' })
      .expect(400, { error: 'No metadata provided' });
  });

  it('returns 400 on an invalid type', async () => {
    await request(app)
      .post('/api/parse-metadata')
      .send({ metadata: '<x/>', type: 'bogus' })
      .expect(400);
  });

  it('parses valid IdP metadata and returns the extracted config', async () => {
    const xml = `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp/meta"><md:IDPSSODescriptor protocolSupportEnumeration="x"><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp/sso"/></md:IDPSSODescriptor></md:EntityDescriptor>`;
    const res = await request(app)
      .post('/api/parse-metadata')
      .send({ metadata: xml, type: 'idp' })
      .expect(200);
    expect(res.body).toEqual({
      success: true,
      config: { issuer: 'https://idp/meta', entryPoint: 'https://idp/sso' }
    });
  });
});
