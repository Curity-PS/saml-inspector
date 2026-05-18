import * as xml2js from 'xml2js';
import { fetchText } from '../lib/httpClient';
import type { IdpConfigSnapshot, SpConfigSnapshot } from '../types/domain';

export type MetadataType = 'idp' | 'sp';

/**
 * Fetch a metadata XML document over HTTP/HTTPS.
 * Self-signed certs are accepted (this app targets local Curity).
 */
export async function fetchMetadata(url: string): Promise<string> {
  return fetchText(url);
}

/**
 * The xml2js Parser configured with mergeAttrs returns nodes whose attributes
 * live at the top level alongside child elements. We model that as a loose
 * dictionary and narrow with helpers.
 */
type MetadataNode = Record<string, unknown>;

export function parseMetadata(metadataXml: string, type: 'idp'): Promise<IdpConfigSnapshot>;
export function parseMetadata(metadataXml: string, type: 'sp'): Promise<SpConfigSnapshot>;
export function parseMetadata(
  metadataXml: string,
  type: MetadataType
): Promise<IdpConfigSnapshot | SpConfigSnapshot>;
export function parseMetadata(
  metadataXml: string,
  type: MetadataType = 'idp'
): Promise<IdpConfigSnapshot | SpConfigSnapshot> {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    parser.parseString(metadataXml, (err, result: MetadataNode | undefined) => {
      if (err) {
        return reject(new Error('Failed to parse metadata XML: ' + err.message));
      }
      try {
        const descriptor = pickNs(result, 'EntityDescriptor');
        if (!descriptor) {
          return reject(new Error('No EntityDescriptor found in metadata'));
        }
        if (type === 'idp') resolve(extractIdpConfig(descriptor));
        else if (type === 'sp') resolve(extractSpConfig(descriptor));
        else reject(new Error(`Unknown metadata type: ${type as string}`));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reject(new Error('Failed to extract configuration from metadata: ' + message));
      }
    });
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────

function pickNs(obj: unknown, localName: string): MetadataNode | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const rec = obj as MetadataNode;
  const value = rec[`md:${localName}`] ?? rec[localName];
  return isNode(value) ? value : undefined;
}

function pickNsDs(obj: unknown, localName: string): MetadataNode | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const rec = obj as MetadataNode;
  const value = rec[`ds:${localName}`] ?? rec[localName];
  return isNode(value) ? value : undefined;
}

function pickNsString(obj: unknown, localName: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const rec = obj as MetadataNode;
  const value = rec[`ds:${localName}`] ?? rec[localName];
  return typeof value === 'string' ? value : undefined;
}

function asArray(value: unknown): MetadataNode[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.filter(isNode);
}

function isNode(v: unknown): v is MetadataNode {
  return typeof v === 'object' && v !== null;
}

function asString(node: MetadataNode, key: string): string | undefined {
  const v = node[key];
  return typeof v === 'string' ? v : undefined;
}

function findBinding(services: MetadataNode[], suffix: string): MetadataNode | undefined {
  return services.find((s) => {
    const binding = s['Binding'];
    return typeof binding === 'string' && binding.includes(suffix);
  });
}

function extractIdpConfig(descriptor: MetadataNode): IdpConfigSnapshot {
  const idp = pickNs(descriptor, 'IDPSSODescriptor');
  if (!idp) throw new Error('No IDPSSODescriptor found in metadata');

  const config: IdpConfigSnapshot = { issuer: asString(descriptor, 'entityID') };

  const ssoServices = asArray(idp[`md:SingleSignOnService`] ?? idp['SingleSignOnService']);
  const redirect = findBinding(ssoServices, 'HTTP-Redirect');
  const post = findBinding(ssoServices, 'HTTP-POST');
  config.entryPoint = asString(redirect ?? {}, 'Location') ?? asString(post ?? {}, 'Location');

  const sloServices = asArray(idp[`md:SingleLogoutService`] ?? idp['SingleLogoutService']);
  if (sloServices[0]) config.logoutUrl = asString(sloServices[0], 'Location');

  const keyDescriptors = asArray(idp[`md:KeyDescriptor`] ?? idp['KeyDescriptor']);
  const signingKey = keyDescriptors.find((k) => {
    const use = k['use'];
    return use === undefined || use === 'signing';
  });
  if (signingKey) {
    const keyInfo = pickNsDs(signingKey, 'KeyInfo');
    const x509Data = pickNsDs(keyInfo, 'X509Data');
    const x509Cert = pickNsString(x509Data, 'X509Certificate');
    if (x509Cert) {
      config.cert = x509Cert.replace(/\s+/g, '');
    }
  }
  return config;
}

function extractSpConfig(descriptor: MetadataNode): SpConfigSnapshot {
  const sp = pickNs(descriptor, 'SPSSODescriptor');
  if (!sp) throw new Error('No SPSSODescriptor found in metadata');

  const config: SpConfigSnapshot = { issuer: asString(descriptor, 'entityID') };

  const acsServices = asArray(sp[`md:AssertionConsumerService`] ?? sp['AssertionConsumerService']);
  const defaultAcs = acsServices.find((s) => s['isDefault'] === 'true') ?? acsServices[0];
  if (defaultAcs) config.callbackUrl = asString(defaultAcs, 'Location');

  const sloServices = asArray(sp[`md:SingleLogoutService`] ?? sp['SingleLogoutService']);
  if (sloServices[0]) config.logoutCallbackUrl = asString(sloServices[0], 'Location');

  return config;
}
