/**
 * Minimal in-memory cookie jar for the unsolicited SAML test flow.
 *
 * Curity's authn pipeline issues session cookies across multiple hops:
 *   ACS POST → auto-submit form → /dev/oauth/authorize → 303 with code
 * Each hop's Set-Cookie must be re-sent on the next request, otherwise
 * the OAuth authorize step can't find the SSO session.
 */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  absorb(setCookieHeaders: string | string[] | undefined | null): void {
    if (!setCookieHeaders) return;
    const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const sc of arr) {
      const first = sc.split(';')[0];
      if (!first) continue;
      const eq = first.indexOf('=');
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (/expires=|max-age=0/i.test(sc) && value === '') {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(): string | null {
    if (this.cookies.size === 0) return null;
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}
