import { describe, expect, it } from 'vitest';
import { CookieJar } from './cookieJar';

describe('CookieJar', () => {
  it('absorbs a single Set-Cookie header', () => {
    const jar = new CookieJar();
    jar.absorb('sid=abc123; Path=/; HttpOnly');
    expect(jar.header()).toBe('sid=abc123');
  });

  it('absorbs multiple cookies and joins them with "; "', () => {
    const jar = new CookieJar();
    jar.absorb(['sid=abc; Path=/', 'csrf=xyz; HttpOnly']);
    const header = jar.header();
    expect(header).toContain('sid=abc');
    expect(header).toContain('csrf=xyz');
    expect(header).toContain('; ');
  });

  it('overwrites a cookie when the same name appears twice', () => {
    const jar = new CookieJar();
    jar.absorb('sid=first; Path=/');
    jar.absorb('sid=second; Path=/');
    expect(jar.header()).toBe('sid=second');
  });

  it('deletes a cookie when value is empty and max-age=0', () => {
    const jar = new CookieJar();
    jar.absorb('sid=abc; Path=/');
    jar.absorb('sid=; Path=/; Max-Age=0');
    expect(jar.header()).toBeNull();
  });

  it('ignores Set-Cookie strings without "="', () => {
    const jar = new CookieJar();
    jar.absorb('garbage-no-equals');
    expect(jar.header()).toBeNull();
  });

  it('returns null when the jar is empty', () => {
    expect(new CookieJar().header()).toBeNull();
  });

  it('handles null/undefined input gracefully', () => {
    const jar = new CookieJar();
    jar.absorb(null);
    jar.absorb(undefined);
    expect(jar.header()).toBeNull();
  });
});
