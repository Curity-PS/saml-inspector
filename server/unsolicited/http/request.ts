import type { CookieJar } from './cookieJar';

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  jar?: CookieJar;
  redirect?: 'follow' | 'manual' | 'error';
}

/**
 * Wrapper around the global fetch that:
 *  - attaches the jar's Cookie header on the way out
 *  - absorbs Set-Cookie headers on the way in
 *  - disables TLS verification for the duration of the call (self-signed
 *    Curity is the target; see CLAUDE.md gotcha #7 — the env-var scope is
 *    intentionally per-call, not process-wide)
 */
export async function request(url: string, opts: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, jar, redirect = 'manual' } = opts;
  let headers = opts.headers ?? {};

  const cookieHeader = jar?.header();
  if (cookieHeader) {
    headers = { ...headers, cookie: cookieHeader };
  }

  const init: RequestInit = { method, headers, body, redirect };

  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  let res: Response;
  try {
    res = await fetch(url, init);
  } finally {
    if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
  }

  if (jar) {
    const setCookie = readSetCookie(res.headers);
    jar.absorb(setCookie);
  }
  return res;
}

function readSetCookie(headers: Headers): string[] | undefined {
  // Node's undici Headers exposes getSetCookie() (preferred). Older runtimes
  // surface them via headers.raw()['set-cookie'].
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetter.getSetCookie === 'function') {
    return withGetter.getSetCookie();
  }
  const withRaw = headers as Headers & { raw?: () => Record<string, string[]> };
  return withRaw.raw?.()['set-cookie'];
}
