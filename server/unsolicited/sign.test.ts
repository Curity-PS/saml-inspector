import { describe, expect, it } from 'vitest';
import * as forge from 'node-forge';
import { DOMParser } from '@xmldom/xmldom';
import { buildResponseXml } from './buildResponse';
import { signAssertion, signResponse, repositionSignatureAfterIssuer } from './sign';

/**
 * These tests guard CLAUDE.md gotcha #2: <ds:Signature> MUST appear
 * immediately after <saml:Issuer> in both the Assertion and the Response.
 * xml-crypto's default behavior puts it as the last child of the signed
 * element; if `repositionSignatureAfterIssuer` ever stops running, Curity
 * rejects the signature with a generic schema error.
 */

const NS_DS = 'http://www.w3.org/2000/09/xmldsig#';
const NS_SAML = 'urn:oasis:names:tc:SAML:2.0:assertion';

interface Pair {
  keyPem: string;
  certPem: string;
}

let cachedPair: Pair | undefined;

function makeKeypair(): Pair {
  if (cachedPair) return cachedPair;
  // RSA-2048 generation is ~1-2 seconds; cache across the test file.
  const kp = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = kp.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
  cert.setSubject([{ name: 'commonName', value: 'test' }]);
  cert.setIssuer([{ name: 'commonName', value: 'test' }]);
  cert.sign(kp.privateKey, forge.md.sha256.create());
  cachedPair = {
    keyPem: forge.pki.privateKeyToPem(kp.privateKey),
    certPem: forge.pki.certificateToPem(cert)
  };
  return cachedPair;
}

function unsignedXml(): string {
  return buildResponseXml({
    destination: 'https://example.org/acs',
    idpEntityId: 'https://idp.example.org/metadata',
    audience: 'https://sp.example.org/metadata',
    nameId: 'alice'
  }).xml;
}

function nextElementSiblings(xml: string, scope: 'Response' | 'Assertion'): string[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const target =
    scope === 'Response'
      ? doc.documentElement
      : doc.getElementsByTagNameNS('*', 'Assertion')[0];
  if (!target) throw new Error(`No <${scope}> element found in test input`);
  return Array.from(target.childNodes)
    .filter((n) => n.nodeType === 1)
    .map((n) => (n as Element).localName);
}

describe('signAssertion / signResponse', () => {
  it('places <ds:Signature> immediately after <saml:Issuer> inside the Assertion', () => {
    const { keyPem, certPem } = makeKeypair();
    const signed = signAssertion(unsignedXml(), keyPem, certPem);
    const children = nextElementSiblings(signed, 'Assertion');
    const issuerIdx = children.indexOf('Issuer');
    expect(issuerIdx).toBeGreaterThanOrEqual(0);
    expect(children[issuerIdx + 1]).toBe('Signature');
  });

  it('places <ds:Signature> immediately after <saml:Issuer> inside the Response', () => {
    const { keyPem, certPem } = makeKeypair();
    const signed = signResponse(unsignedXml(), keyPem, certPem);
    const children = nextElementSiblings(signed, 'Response');
    const issuerIdx = children.indexOf('Issuer');
    expect(issuerIdx).toBeGreaterThanOrEqual(0);
    expect(children[issuerIdx + 1]).toBe('Signature');
  });

  it('produces nested signatures when assertion is signed before response (gotcha #3)', () => {
    const { keyPem, certPem } = makeKeypair();
    const assertionSigned = signAssertion(unsignedXml(), keyPem, certPem);
    const bothSigned = signResponse(assertionSigned, keyPem, certPem);

    // There should be at least two <ds:Signature> elements in the document
    // (one on the Response, one on the Assertion).
    const doc = new DOMParser().parseFromString(bothSigned, 'text/xml');
    const sigs = doc.getElementsByTagNameNS(NS_DS, 'Signature');
    expect(sigs.length).toBe(2);
  });
});

describe('repositionSignatureAfterIssuer', () => {
  it('moves a trailing Signature to immediately after Issuer', () => {
    const xml = [
      `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="${NS_SAML}" xmlns:ds="${NS_DS}">`,
      `<saml:Issuer>i</saml:Issuer>`,
      `<samlp:Status/>`,
      `<saml:Assertion/>`,
      `<ds:Signature/>`,
      `</samlp:Response>`
    ].join('');

    const moved = repositionSignatureAfterIssuer(xml, "/*[local-name(.)='Response']");
    const children = nextElementSiblings(moved, 'Response');
    expect(children).toEqual(['Issuer', 'Signature', 'Status', 'Assertion']);
  });

  it('is a no-op when Signature is already after Issuer', () => {
    const xml = [
      `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="${NS_SAML}" xmlns:ds="${NS_DS}">`,
      `<saml:Issuer>i</saml:Issuer>`,
      `<ds:Signature/>`,
      `<samlp:Status/>`,
      `</samlp:Response>`
    ].join('');

    const out = repositionSignatureAfterIssuer(xml, "/*[local-name(.)='Response']");
    // Same shape, no exception.
    const children = nextElementSiblings(out, 'Response');
    expect(children).toEqual(['Issuer', 'Signature', 'Status']);
  });

  it('returns the xml unchanged if Issuer or Signature is missing', () => {
    const noSig = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="${NS_SAML}"><saml:Issuer>i</saml:Issuer></samlp:Response>`;
    expect(repositionSignatureAfterIssuer(noSig, "/*[local-name(.)='Response']")).toBe(noSig);
  });
});
