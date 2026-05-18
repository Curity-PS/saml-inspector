import * as zlib from 'node:zlib';
import * as xml2js from 'xml2js';
import type { DecodedSaml } from '../types/domain';

/**
 * Decode a SAML message (base64-encoded and optionally deflate-compressed).
 * Returns { xml, json, prettified } on success, or { error, raw } on failure.
 */
export function decodeSAML(samlString: string, isEncoded: boolean = true): DecodedSaml {
  try {
    let decoded = samlString;

    if (isEncoded) {
      const buffer = Buffer.from(samlString, 'base64');
      try {
        decoded = zlib.inflateRawSync(buffer).toString();
      } catch {
        decoded = buffer.toString();
      }
    }

    let jsonResult: unknown = null;
    const parser = new xml2js.Parser({ explicitArray: false });
    parser.parseString(decoded, (err, result) => {
      if (!err) jsonResult = result;
    });

    return {
      xml: decoded,
      json: jsonResult,
      prettified: decoded.replace(/></g, '>\n<')
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, raw: samlString };
  }
}
