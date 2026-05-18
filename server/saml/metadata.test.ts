import { describe, expect, it } from 'vitest';
import { parseMetadata } from './metadata';

const IDP_WITH_MD_PREFIX = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="https://idp.example.org/metadata">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIID-FAKE-CERT
WITH WHITESPACE</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="https://idp.example.org/slo"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="https://idp.example.org/sso-redirect"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="https://idp.example.org/sso-post"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;

const IDP_WITHOUT_PREFIX = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="https://idp.example.org/metadata">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                         Location="https://idp.example.org/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>`;

const SP_METADATA = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="https://sp.example.org/metadata">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                  Location="https://sp.example.org/acs"
                                  isDefault="true"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="https://sp.example.org/slo"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

describe('parseMetadata — IdP', () => {
  it('extracts entityID, entryPoint (HTTP-Redirect preferred), cert and logout URL with md: prefix', async () => {
    const config = await parseMetadata(IDP_WITH_MD_PREFIX, 'idp');
    expect(config.issuer).toBe('https://idp.example.org/metadata');
    expect(config.entryPoint).toBe('https://idp.example.org/sso-redirect');
    expect(config.logoutUrl).toBe('https://idp.example.org/slo');
    // Cert whitespace must be stripped.
    expect(config.cert).toBe('MIID-FAKE-CERTWITHWHITESPACE');
  });

  it('falls back to HTTP-POST entryPoint if no HTTP-Redirect binding is offered', async () => {
    const xml = IDP_WITH_MD_PREFIX.replace(
      /SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"\s+Location="[^"]+"/,
      'SingleSignOnService Binding="other" Location="https://nope/"'
    );
    const config = await parseMetadata(xml, 'idp');
    expect(config.entryPoint).toBe('https://idp.example.org/sso-post');
  });

  it('parses metadata using the default namespace (no md: prefix)', async () => {
    const config = await parseMetadata(IDP_WITHOUT_PREFIX, 'idp');
    expect(config.issuer).toBe('https://idp.example.org/metadata');
    expect(config.entryPoint).toBe('https://idp.example.org/sso');
  });

  it('rejects when EntityDescriptor is missing', async () => {
    await expect(parseMetadata('<wrong/>', 'idp')).rejects.toThrow(/EntityDescriptor/);
  });

  it('rejects when IDPSSODescriptor is missing', async () => {
    const xml = `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="x"/>`;
    await expect(parseMetadata(xml, 'idp')).rejects.toThrow(/IDPSSODescriptor/);
  });

  it('rejects malformed XML with a useful error message', async () => {
    await expect(parseMetadata('<not<xml>', 'idp')).rejects.toThrow(/parse metadata XML/);
  });
});

describe('parseMetadata — SP', () => {
  it('extracts SP entityID, ACS callback and SLO URL', async () => {
    const config = await parseMetadata(SP_METADATA, 'sp');
    expect(config.issuer).toBe('https://sp.example.org/metadata');
    expect(config.callbackUrl).toBe('https://sp.example.org/acs');
    expect(config.logoutCallbackUrl).toBe('https://sp.example.org/slo');
  });

  it('rejects when SPSSODescriptor is missing', async () => {
    const xml = `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="x"/>`;
    await expect(parseMetadata(xml, 'sp')).rejects.toThrow(/SPSSODescriptor/);
  });
});
