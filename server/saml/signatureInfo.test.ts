import { describe, expect, it } from 'vitest';
import { extractSignatureInfo } from './signatureInfo';

describe('extractSignatureInfo', () => {
  it('returns signed=false for empty/undefined input', () => {
    expect(extractSignatureInfo(undefined).signed).toBe(false);
    expect(extractSignatureInfo('').signed).toBe(false);
    expect(extractSignatureInfo('<x/>').signed).toBe(false);
  });

  it('detects a response-level Signature (default ns, no prefix)', () => {
    const xml = `<Response xmlns="urn:oasis:names:tc:SAML:2.0:protocol">
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
          <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        </SignedInfo>
      </Signature>
    </Response>`;
    const info = extractSignatureInfo(xml);
    expect(info.signed).toBe(true);
    expect(info.assertionSigned).toBe(false);
    expect(info.signatureAlgorithm).toBe('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
    expect(info.digestAlgorithm).toBe('http://www.w3.org/2001/04/xmlenc#sha256');
  });

  it('detects a Signature inside Assertion (ds: prefix)', () => {
    const xml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
      <saml:Assertion>
        <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
          <ds:SignedInfo>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          </ds:SignedInfo>
        </ds:Signature>
      </saml:Assertion>
    </samlp:Response>`;
    const info = extractSignatureInfo(xml);
    expect(info.signed).toBe(true);
    expect(info.assertionSigned).toBe(true);
  });

  it('does not classify Response-level signature as assertion-signed', () => {
    const xml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
      <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:SignedInfo>
          <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        </ds:SignedInfo>
      </ds:Signature>
      <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <saml:Subject/>
      </saml:Assertion>
    </samlp:Response>`;
    const info = extractSignatureInfo(xml);
    expect(info.signed).toBe(true);
    expect(info.assertionSigned).toBe(false);
  });
});
