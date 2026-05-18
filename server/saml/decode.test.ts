import { describe, expect, it } from 'vitest';
import * as zlib from 'node:zlib';
import { decodeSAML } from './decode';

const SAMPLE_XML = '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"><Status/></samlp:Response>';

function base64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

function deflateBase64(s: string): string {
  return zlib.deflateRawSync(Buffer.from(s, 'utf8')).toString('base64');
}

describe('decodeSAML', () => {
  it('decodes a plain base64-encoded XML payload', () => {
    const result = decodeSAML(base64(SAMPLE_XML));
    if ('error' in result) throw new Error('expected success result');
    expect(result.xml).toBe(SAMPLE_XML);
    expect(result.prettified).toContain('\n');
    expect(result.json).toBeTruthy();
  });

  it('decodes a deflate-then-base64 payload (HTTP-Redirect binding)', () => {
    const result = decodeSAML(deflateBase64(SAMPLE_XML));
    if ('error' in result) throw new Error('expected success result');
    expect(result.xml).toBe(SAMPLE_XML);
  });

  it('returns the raw string when isEncoded=false', () => {
    const result = decodeSAML(SAMPLE_XML, false);
    if ('error' in result) throw new Error('expected success result');
    expect(result.xml).toBe(SAMPLE_XML);
  });

  it('prettifies by inserting newlines between adjacent tags', () => {
    const result = decodeSAML(base64('<a><b/></a>'));
    if ('error' in result) throw new Error('expected success result');
    expect(result.prettified).toBe('<a>\n<b/>\n</a>');
  });

  it('parses xml into a JSON tree when xml2js succeeds', () => {
    const result = decodeSAML(base64('<root><child>value</child></root>'));
    if ('error' in result) throw new Error('expected success result');
    expect(result.json).toEqual({ root: { child: 'value' } });
  });

  it('still returns xml even when xml2js cannot parse it', () => {
    // Invalid XML — xml2js fails but we should still get the raw decoded text.
    const result = decodeSAML(base64('not valid xml at all'));
    if ('error' in result) throw new Error('expected success result');
    expect(result.xml).toBe('not valid xml at all');
    expect(result.json).toBeNull();
  });
});
