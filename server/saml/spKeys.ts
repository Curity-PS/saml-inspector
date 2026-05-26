import * as fs from 'node:fs';
import * as path from 'node:path';
import * as forge from 'node-forge';

/**
 * SP-side signing keypair, used by passport-saml to sign outbound
 * <samlp:AuthnRequest> and <samlp:LogoutRequest> when the user enables
 * "Sign AuthnRequest" in the UI.
 *
 * Deliberately kept separate from server/unsolicited/keys.ts — that key is
 * the IdP-impersonation key used by the *unsolicited Response* flow. These
 * keys are mounted at the *SP* role in the SP-Initiated flow. Sharing one
 * keypair would mix two trust relationships in a single PEM file.
 */
const DEFAULT_DIR = path.resolve(__dirname, '..', 'keys');
const DEFAULT_KEY = path.join(DEFAULT_DIR, 'sp-signing.key.pem');
const DEFAULT_CERT = path.join(DEFAULT_DIR, 'sp-signing.crt.pem');

export interface SpKeyPaths {
  keyPath?: string;
  certPath?: string;
}

export interface EnsureSpKeysResult {
  keyPath: string;
  certPath: string;
  generated: boolean;
}

interface GeneratedPair {
  keyPem: string;
  certPem: string;
}

function generate(): GeneratedPair {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const cert = forge.pki.createCertificate();

  cert.publicKey = keypair.publicKey;
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));

  const now = new Date();
  cert.validity.notBefore = new Date(now.getTime() - 5 * 60 * 1000);
  cert.validity.notAfter = new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000);

  const attrs = [
    { name: 'countryName', value: 'SE' },
    { name: 'organizationName', value: 'curity-test' },
    { name: 'commonName', value: 'saml-inspector-sp-signing' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false, critical: true },
    {
      name: 'keyUsage',
      critical: true,
      digitalSignature: true,
      keyEncipherment: false
    },
    { name: 'subjectKeyIdentifier' }
  ]);

  cert.sign(keypair.privateKey, forge.md.sha256.create());

  return {
    keyPem: forge.pki.privateKeyToPem(keypair.privateKey),
    certPem: forge.pki.certificateToPem(cert)
  };
}

export function ensureSpKeysExist({
  keyPath = process.env.SAML_SP_KEY_PATH || DEFAULT_KEY,
  certPath = process.env.SAML_SP_CERT_PATH || DEFAULT_CERT
}: SpKeyPaths = {}): EnsureSpKeysResult {
  const resolvedKey = path.resolve(keyPath);
  const resolvedCert = path.resolve(certPath);

  if (fs.existsSync(resolvedKey) && fs.existsSync(resolvedCert)) {
    return { keyPath: resolvedKey, certPath: resolvedCert, generated: false };
  }

  fs.mkdirSync(path.dirname(resolvedKey), { recursive: true });
  fs.mkdirSync(path.dirname(resolvedCert), { recursive: true });

  const { keyPem, certPem } = generate();
  fs.writeFileSync(resolvedKey, keyPem, { mode: 0o600 });
  fs.writeFileSync(resolvedCert, certPem);

  return { keyPath: resolvedKey, certPath: resolvedCert, generated: true };
}

export function readSpCert(
  certPath: string = process.env.SAML_SP_CERT_PATH || DEFAULT_CERT
): string {
  return fs.readFileSync(path.resolve(certPath), 'utf8');
}

export function readSpKey(
  keyPath: string = process.env.SAML_SP_KEY_PATH || DEFAULT_KEY
): string {
  return fs.readFileSync(path.resolve(keyPath), 'utf8');
}
