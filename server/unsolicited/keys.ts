import * as fs from 'node:fs';
import * as path from 'node:path';
import * as forge from 'node-forge';

const DEFAULT_DIR = path.resolve(__dirname, '..', 'keys');
const DEFAULT_KEY = path.join(DEFAULT_DIR, 'idp-signing.key.pem');
const DEFAULT_CERT = path.join(DEFAULT_DIR, 'idp-signing.crt.pem');

export interface KeyPaths {
  keyPath?: string;
  certPath?: string;
}

export interface EnsureKeysResult {
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
    { name: 'commonName', value: 'saml-inspector-idp-signing' }
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

export function ensureKeysExist({
  keyPath = process.env.UNSOLICITED_KEY_PATH || DEFAULT_KEY,
  certPath = process.env.UNSOLICITED_CERT_PATH || DEFAULT_CERT
}: KeyPaths = {}): EnsureKeysResult {
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

export function readCert(
  certPath: string = process.env.UNSOLICITED_CERT_PATH || DEFAULT_CERT
): string {
  return fs.readFileSync(path.resolve(certPath), 'utf8');
}

export function readKey(
  keyPath: string = process.env.UNSOLICITED_KEY_PATH || DEFAULT_KEY
): string {
  return fs.readFileSync(path.resolve(keyPath), 'utf8');
}
