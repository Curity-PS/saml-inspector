import { describe, expect, it } from 'vitest';
import { buildResponseXml } from './buildResponse';

const BASE_OPTS = {
  destination: 'https://example.org/acs',
  idpEntityId: 'https://idp.example.org/metadata',
  audience: 'https://sp.example.org/metadata',
  nameId: 'alice'
};

describe('buildResponseXml', () => {
  it('returns XML with Destination, Issuer, Audience and NameID at the expected positions', () => {
    const { xml } = buildResponseXml(BASE_OPTS);
    expect(xml).toContain('Destination="https://example.org/acs"');
    expect(xml).toContain('<saml:Issuer>https://idp.example.org/metadata</saml:Issuer>');
    expect(xml).toContain('<saml:Audience>https://sp.example.org/metadata</saml:Audience>');
    expect(xml).toContain('<saml:NameID>alice</saml:NameID>');
  });

  it('returns matching responseId/assertionId values inside the XML', () => {
    const { xml, responseId, assertionId } = buildResponseXml(BASE_OPTS);
    expect(responseId).toMatch(/^_[a-f0-9]{32}$/);
    expect(assertionId).toMatch(/^_[a-f0-9]{32}$/);
    expect(xml).toContain(`ID="${responseId}"`);
    expect(xml).toContain(`ID="${assertionId}"`);
  });

  it('generates fresh IDs on every call', () => {
    const a = buildResponseXml(BASE_OPTS);
    const b = buildResponseXml(BASE_OPTS);
    expect(a.responseId).not.toBe(b.responseId);
    expect(a.assertionId).not.toBe(b.assertionId);
  });

  it('escapes XML special characters in inputs (defence against accidental injection in the audience demo)', () => {
    const { xml } = buildResponseXml({
      ...BASE_OPTS,
      audience: 'https://example.com/?x=<bad>&y="z"'
    });
    expect(xml).toContain('&lt;bad&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).not.toContain('<bad>');
  });

  it('uses default offsets when not specified (-5s notBefore, +3600s notOnOrAfter)', () => {
    const { xml } = buildResponseXml(BASE_OPTS);
    const notBefore = xml.match(/NotBefore="([^"]+)"/)?.[1];
    const notOnOrAfter = xml.match(/NotOnOrAfter="([^"]+)"/)?.[1];
    expect(notBefore).toBeTruthy();
    expect(notOnOrAfter).toBeTruthy();

    const before = new Date(notBefore!).getTime();
    const after = new Date(notOnOrAfter!).getTime();
    // Defaults: notBefore = now - 5s, notOnOrAfter = now + 3600s. Spread is ~3605s.
    expect(after - before).toBeGreaterThanOrEqual(3600 * 1000);
    expect(after - before).toBeLessThan(3610 * 1000);
  });

  it('produces ISO-8601 UTC timestamps without milliseconds', () => {
    const { xml } = buildResponseXml(BASE_OPTS);
    const issueInstant = xml.match(/IssueInstant="([^"]+)"/)?.[1];
    expect(issueInstant).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('emits a bearer SubjectConfirmation with the destination as Recipient', () => {
    const { xml } = buildResponseXml(BASE_OPTS);
    expect(xml).toContain('Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"');
    expect(xml).toContain('Recipient="https://example.org/acs"');
  });
});
