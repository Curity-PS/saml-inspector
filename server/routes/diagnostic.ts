import { Router } from 'express';
import { decodeSAML } from '../saml/decode';
import { parseMetadata, type MetadataType } from '../saml/metadata';
import { headCheck } from '../lib/httpClient';
import * as messageStore from '../saml/messageStore';
import * as state from '../state';
import { PLACEHOLDER_CERT } from '../config/samlConfig';

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
    identifierFormat: samlConfig?.identifierFormat
  });
});

interface ConfigUpdateBody {
  entryPoint?: string;
  issuer?: string;
  callbackUrl?: string;
  cert?: string;
}

router.post('/config', (req, res) => {
  const samlConfig = state.getSamlConfig();
  if (!samlConfig) {
    res.status(503).json({ error: 'SAML config not initialized' });
    return;
  }
  const { entryPoint, issuer, callbackUrl, cert } = req.body as ConfigUpdateBody;
  if (entryPoint) samlConfig.entryPoint = entryPoint;
  if (issuer) samlConfig.issuer = issuer;
  if (callbackUrl) samlConfig.callbackUrl = callbackUrl;
  if (cert) samlConfig.idpCert = cert;
  res.json({ success: true, config: samlConfig });
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
