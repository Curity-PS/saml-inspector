import { describe, expect, it } from 'vitest';
import {
  decodeIdToken,
  deriveTokenUrl,
  extractCodeFromLocation,
  parseAutoSubmitForm
} from './oauthChain';

describe('extractCodeFromLocation', () => {
  it('returns the authorization code and state from a redirect URL', () => {
    const result = extractCodeFromLocation('https://app/cb?code=abc&state=xyz');
    expect(result).toEqual({ code: 'abc', state: 'xyz' });
  });

  it('returns the OAuth error envelope when error is present', () => {
    const result = extractCodeFromLocation('https://app/cb?error=access_denied&error_description=nope');
    expect(result).toEqual({ error: 'access_denied', errorDescription: 'nope' });
  });

  it('flags missing location', () => {
    expect(extractCodeFromLocation(null)).toEqual({ error: 'no_location' });
  });

  it('flags a redirect that has neither code nor error', () => {
    const result = extractCodeFromLocation('https://app/cb?other=value');
    expect(result).toMatchObject({ error: 'no_code' });
  });
});

describe('decodeIdToken', () => {
  function jwt(header: object, payload: object, sig: string = 'sig'): string {
    const enc = (o: object) =>
      Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
    return `${enc(header)}.${enc(payload)}.${sig}`;
  }

  it('decodes the payload of a well-formed JWT', () => {
    const token = jwt({ alg: 'RS256' }, { sub: 'alice', iss: 'idp', exp: 1234 });
    expect(decodeIdToken(token)).toMatchObject({ sub: 'alice', iss: 'idp', exp: 1234 });
  });

  it('returns null for an undefined / non-string input', () => {
    expect(decodeIdToken(undefined)).toBeNull();
    expect(decodeIdToken('')).toBeNull();
  });

  it('returns null for a string that is not a 3-part JWT', () => {
    expect(decodeIdToken('not.ajwt')).toBeNull();
    expect(decodeIdToken('a.b.c.d')).toBeNull();
  });

  it('returns null when the payload is not valid JSON', () => {
    const bad = `${Buffer.from('{}').toString('base64url')}.${Buffer.from('not-json').toString('base64url')}.sig`;
    expect(decodeIdToken(bad)).toBeNull();
  });

  it('handles base64url payloads missing padding', () => {
    // Real-world JWTs have base64url payloads with stripped "=" padding —
    // decodeIdToken adds it back before parsing.
    const payload = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url').replace(/=+$/, '');
    const token = `${Buffer.from('{}').toString('base64url')}.${payload}.sig`;
    expect(decodeIdToken(token)).toEqual({ sub: 'x' });
  });
});

describe('deriveTokenUrl', () => {
  it('swaps /authorize → /token while preserving origin', () => {
    expect(deriveTokenUrl('https://curity.local:8443/dev/authn/authenticate/saml2-sp', '/dev/oauth/authorize')).toBe(
      'https://curity.local:8443/dev/oauth/token'
    );
  });

  it('falls back to /dev/oauth/authorize when resumePath is null/empty', () => {
    expect(deriveTokenUrl('https://curity.local:8443/anything', null)).toBe(
      'https://curity.local:8443/dev/oauth/token'
    );
    expect(deriveTokenUrl('https://curity.local:8443/anything', '')).toBe(
      'https://curity.local:8443/dev/oauth/token'
    );
  });
});

describe('parseAutoSubmitForm', () => {
  it('returns null when no <form> is present', () => {
    expect(parseAutoSubmitForm('<html><body>nope</body></html>')).toBeNull();
  });

  it('extracts action, method and named inputs from a POST form', () => {
    const html = `
      <html><body>
        <form method="post" action="/resume">
          <input type="hidden" name="token" value="csrf-123" />
          <input type="hidden" name="state" value="s" />
        </form>
      </body></html>`;
    const form = parseAutoSubmitForm(html);
    expect(form).toEqual({
      action: '/resume',
      method: 'POST',
      inputs: { token: 'csrf-123', state: 's' }
    });
  });

  it('defaults to GET when no method attribute is present', () => {
    const html = '<form action="/x"><input name="a" value="1" /></form>';
    const form = parseAutoSubmitForm(html);
    expect(form?.method).toBe('GET');
    expect(form?.inputs.a).toBe('1');
  });

  it('ignores inputs without a name', () => {
    const html = '<form action="/"><input value="orphan" /><input name="ok" value="yes" /></form>';
    const form = parseAutoSubmitForm(html);
    expect(form?.inputs).toEqual({ ok: 'yes' });
  });
});
