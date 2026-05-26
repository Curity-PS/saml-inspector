/**
 * Inspect a decoded SAML message XML and extract signature presence + the
 * algorithms in use. Used by the Inspector to show "Signed" badges on
 * captured Responses (and to detect assertion-level vs response-level
 * signing — a Response with an unsigned envelope but a signed Assertion is
 * still cryptographically trustworthy).
 *
 * Plain string + regex inspection is sufficient: the XMLDSig namespace URI
 * is fixed, and the SignatureMethod / DigestMethod elements each carry a
 * single Algorithm attribute. We deliberately do not parse a DOM — the goal
 * is "what's in there for UI display", not signature verification.
 */

export interface SignatureInfo {
  signed: boolean;
  /** True iff a Signature element is nested inside an Assertion. */
  assertionSigned: boolean;
  /** URI value from the response-level <SignatureMethod Algorithm="…"/>. */
  signatureAlgorithm?: string;
  /** URI value from the response-level <DigestMethod Algorithm="…"/>. */
  digestAlgorithm?: string;
}

const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';

export function extractSignatureInfo(xml: string | undefined): SignatureInfo {
  if (!xml) return { signed: false, assertionSigned: false };

  const signed = xml.includes(XMLDSIG_NS);
  if (!signed) return { signed: false, assertionSigned: false };

  // Detect a Signature inside an Assertion. Match either prefix order
  // (<Assertion … <Signature>) — the SAML schema requires Signature to
  // appear as a direct child of Assertion (right after Issuer), so any
  // Signature open-tag within the Assertion span counts.
  const assertionMatch = xml.match(/<(?:[\w-]+:)?Assertion\b[\s\S]*?<\/(?:[\w-]+:)?Assertion>/);
  const assertionSigned = !!assertionMatch && /<(?:[\w-]+:)?Signature\b/.test(assertionMatch[0]);

  const sigMethodMatch = xml.match(/<(?:[\w-]+:)?SignatureMethod\s+Algorithm="([^"]+)"/);
  const digestMethodMatch = xml.match(/<(?:[\w-]+:)?DigestMethod\s+Algorithm="([^"]+)"/);

  return {
    signed,
    assertionSigned,
    signatureAlgorithm: sigMethodMatch?.[1],
    digestAlgorithm: digestMethodMatch?.[1]
  };
}
