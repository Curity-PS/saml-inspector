import { SignedXml } from 'xml-crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const NS_SAML = 'urn:oasis:names:tc:SAML:2.0:assertion';
const NS_DS = 'http://www.w3.org/2000/09/xmldsig#';

const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const EXC_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#';
const SHA256_DIGEST = 'http://www.w3.org/2001/04/xmlenc#sha256';
const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';

const ASSERTION_XPATH = "//*[local-name(.)='Assertion']";
const RESPONSE_XPATH = "/*[local-name(.)='Response']";

export interface SignInput {
  xml: string;
  signXpath: string;
  keyPem: string;
  certPem: string;
}

export function signSamlElement({ xml, signXpath, keyPem, certPem }: SignInput): string {
  const sig = new SignedXml({
    privateKey: keyPem,
    publicCert: certPem,
    signatureAlgorithm: RSA_SHA256,
    canonicalizationAlgorithm: EXC_C14N
  });

  sig.addReference({
    xpath: signXpath,
    digestAlgorithm: SHA256_DIGEST,
    transforms: [ENVELOPED, EXC_C14N]
  });

  sig.computeSignature(xml, {
    prefix: 'ds',
    location: { reference: signXpath, action: 'append' }
  });

  return repositionSignatureAfterIssuer(sig.getSignedXml(), signXpath);
}

export function signAssertion(xml: string, keyPem: string, certPem: string): string {
  return signSamlElement({ xml, signXpath: ASSERTION_XPATH, keyPem, certPem });
}

export function signResponse(xml: string, keyPem: string, certPem: string): string {
  return signSamlElement({ xml, signXpath: RESPONSE_XPATH, keyPem, certPem });
}

/**
 * SAML 2.0 schema requires <ds:Signature> immediately after <saml:Issuer>.
 * xml-crypto appends it as the last child of the signed element by default,
 * so we re-home it. Removing this function breaks Curity signature verification.
 */
export function repositionSignatureAfterIssuer(xml: string, signXpath: string): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (!doc.documentElement) return xml;

  const targetLocalName = signXpath.includes('Response') ? 'Response' : 'Assertion';
  const target = findFirstByLocalName(doc.documentElement, targetLocalName);
  if (!target) return xml;

  const elementChildren = Array.from(target.childNodes).filter(
    (n): n is Element => n.nodeType === 1
  );
  const issuer = elementChildren.find(
    (c) => c.localName === 'Issuer' && c.namespaceURI === NS_SAML
  );
  const signature = elementChildren.find(
    (c) => c.localName === 'Signature' && c.namespaceURI === NS_DS && c.parentNode === target
  );
  if (!issuer || !signature) return xml;

  if (issuer.nextSibling === signature) return xml;

  target.removeChild(signature);
  if (issuer.nextSibling) {
    target.insertBefore(signature, issuer.nextSibling);
  } else {
    target.appendChild(signature);
  }
  return new XMLSerializer().serializeToString(doc);
}

function findFirstByLocalName(root: Element, localName: string): Element | null {
  if (root.localName === localName) return root;
  const list = root.getElementsByTagNameNS('*', localName);
  return list && list.length > 0 ? list[0] ?? null : null;
}
