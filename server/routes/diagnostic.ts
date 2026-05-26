import { Router } from 'express';
import { decodeSAML } from '../saml/decode';
import { parseMetadata, type MetadataType } from '../saml/metadata';
import { headCheck } from '../lib/httpClient';
import * as messageStore from '../saml/messageStore';
import * as state from '../state';
import { PLACEHOLDER_CERT, buildSamlConfig } from '../config/samlConfig';
import { registerSamlStrategy } from '../saml/strategy';
import { readSpCert } from '../saml/spKeys';
import * as persisted from '../config/persistedConfig';

const router = Router();

router.get('/health', (req, res) => {
  const samlConfig = state.getSamlConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configured: state.isSamlConfigured(),
    config: {
      entryPoint: samlConfig?.entryPoint,
      issuer: samlConfig?.issuer,
      callbackUrl: samlConfig?.callbackUrl,
      hasCert: !!samlConfig?.idpCert
    }
  });
});

router.get('/session', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user ?? null
  });
});

router.get('/idp-status', async (req, res) => {
  const entryPoint = state.getSamlConfig()?.entryPoint;
  if (!entryPoint || entryPoint.includes('not-configured.example.com')) {
    res.json({ reachable: false, reason: 'not_configured' });
    return;
  }
  res.json(await headCheck(entryPoint));
});

router.get('/config', (req, res) => {
  const samlConfig = state.getSamlConfig();
  res.json({
    entryPoint: samlConfig?.entryPoint,
    issuer: samlConfig?.issuer,
    callbackUrl: samlConfig?.callbackUrl,
    hasCert: !!samlConfig?.idpCert && samlConfig.idpCert !== PLACEHOLDER_CERT,
    identifierFormat: samlConfig?.identifierFormat,
    signAuthnRequests: samlConfig?.signAuthnRequests ?? false,
    authnRequestBinding: samlConfig?.authnRequestBinding ?? 'HTTP-Redirect'
  });
});

interface ConfigUpdateBody {
  entryPoint?: string;
  issuer?: string;
  callbackUrl?: string;
  cert?: string;
  signAuthnRequests?: boolean;
  authnRequestBinding?: 'HTTP-Redirect' | 'HTTP-POST';
}

router.post('/config', (req, res) => {
  const samlConfig = state.getSamlConfig();
  if (!samlConfig) {
    res.status(503).json({ error: 'SAML config not initialized' });
    return;
  }
  const { entryPoint, issuer, callbackUrl, cert, signAuthnRequests, authnRequestBinding } =
    req.body as ConfigUpdateBody;

  if (entryPoint) process.env.SAML_IDP_ENTRY_POINT = entryPoint;
  if (cert) process.env.SAML_IDP_CERT = cert;

  // signAuthnRequests has to flow through buildSamlConfig + a full strategy
  // re-registration: passport-saml captures its options at construction time,
  // so mutating samlConfig in place would not take effect.
  const nextSign = signAuthnRequests ?? samlConfig.signAuthnRequests;
  if (typeof signAuthnRequests === 'boolean') {
    // Persist so the toggle survives server restarts (nodemon, fresh boots).
    // Without this the UI's toggle and the live state silently desync.
    persisted.write({ signAuthnRequests });
  }
  if (authnRequestBinding) {
    persisted.write({ authnRequestBinding });
  }
  const next = buildSamlConfig(nextSign, authnRequestBinding);

  if (issuer) next.samlConfig.issuer = issuer;
  if (callbackUrl) next.samlConfig.callbackUrl = callbackUrl;

  state.setSamlConfig(next.samlConfig, next.isSamlConfigured);
  registerSamlStrategy(next);

  res.json({
    success: true,
    config: {
      entryPoint: next.samlConfig.entryPoint,
      issuer: next.samlConfig.issuer,
      callbackUrl: next.samlConfig.callbackUrl,
      hasCert: !!next.samlConfig.idpCert && next.samlConfig.idpCert !== PLACEHOLDER_CERT,
      identifierFormat: next.samlConfig.identifierFormat,
      signAuthnRequests: next.samlConfig.signAuthnRequests,
      authnRequestBinding: next.samlConfig.authnRequestBinding
    }
  });
});

interface ParseMetadataBody {
  metadata?: string;
  type?: string;
}

router.post('/parse-metadata', async (req, res) => {
  const { metadata, type } = req.body as ParseMetadataBody;
  if (!metadata) {
    res.status(400).json({ error: 'No metadata provided' });
    return;
  }
  if (!type || (type !== 'idp' && type !== 'sp')) {
    res.status(400).json({ error: 'Invalid type. Must be "idp" or "sp"' });
    return;
  }
  try {
    const config = await parseMetadata(metadata, type as MetadataType);
    res.json({ success: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

// SP-side signing cert PEM. Distinct from /api/unsolicited/cert (which is
// the IdP-impersonation cert). Register this one on Curity's SAML2 SP entry
// as a signature-verification key when AuthnRequest signing is enabled.
router.get('/sp-signing-cert', (req, res) => {
  try {
    res.type('application/x-pem-file').send(readSpCert());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  }
});

router.get('/messages', (req, res) => {
  res.json(messageStore.getAll());
});

router.delete('/messages', (req, res) => {
  messageStore.clear();
  res.json({ success: true });
});

interface DecodeBody {
  message?: string;
  isEncoded?: boolean;
}

router.post('/decode', (req, res) => {
  const { message, isEncoded } = req.body as DecodeBody;
  if (!message) {
    res.status(400).json({ error: 'No message provided' });
    return;
  }
  res.json(decodeSAML(message, isEncoded !== false));
});

export default router;
