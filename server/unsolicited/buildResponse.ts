import * as crypto from 'node:crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export type DomDocument = ReturnType<DOMParser['parseFromString']>;

export const NS_SAMLP = 'urn:oasis:names:tc:SAML:2.0:protocol';
export const NS_SAML = 'urn:oasis:names:tc:SAML:2.0:assertion';

export interface BuildResponseOptions {
  destination: string;
  idpEntityId: string;
  audience: string;
  nameId: string;
  /** Default: -5 seconds (clock-skew tolerance) */
  notBeforeOffsetSec?: number;
  /** Default: 3600 seconds (1 hour) */
  notOnOrAfterOffsetSec?: number;
}

export interface BuildResponseResult {
  xml: string;
  responseId: string;
  assertionId: string;
}

function newId(): string {
  return '_' + crypto.randomBytes(16).toString('hex');
}

function isoUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildResponseXml(opts: BuildResponseOptions): BuildResponseResult {
  const {
    destination,
    idpEntityId,
    audience,
    nameId,
    notBeforeOffsetSec = -5,
    notOnOrAfterOffsetSec = 3600
  } = opts;

  const now = new Date();
  const issueInstant = isoUtc(now);
  const notBefore = isoUtc(new Date(now.getTime() + notBeforeOffsetSec * 1000));
  const notOnOrAfter = isoUtc(new Date(now.getTime() + notOnOrAfterOffsetSec * 1000));

  const responseId = newId();
  const assertionId = newId();
  const sessionIndex = '_' + crypto.randomBytes(8).toString('hex');

  const xml =
    `<samlp:Response xmlns:samlp="${NS_SAMLP}" xmlns:saml="${NS_SAML}" Destination="${escapeXml(destination)}" ID="${responseId}" IssueInstant="${issueInstant}" Version="2.0">` +
    `<saml:Issuer>${escapeXml(idpEntityId)}</saml:Issuer>` +
    `<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>` +
    `<saml:Assertion ID="${assertionId}" IssueInstant="${issueInstant}" Version="2.0">` +
    `<saml:Issuer>${escapeXml(idpEntityId)}</saml:Issuer>` +
    `<saml:Subject>` +
    `<saml:NameID>${escapeXml(nameId)}</saml:NameID>` +
    `<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">` +
    `<saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}" Recipient="${escapeXml(destination)}"/>` +
    `</saml:SubjectConfirmation>` +
    `</saml:Subject>` +
    `<saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">` +
    `<saml:AudienceRestriction><saml:Audience>${escapeXml(audience)}</saml:Audience></saml:AudienceRestriction>` +
    `</saml:Conditions>` +
    `<saml:AuthnStatement AuthnInstant="${issueInstant}" SessionIndex="${sessionIndex}">` +
    `<saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext>` +
    `</saml:AuthnStatement>` +
    `</saml:Assertion>` +
    `</samlp:Response>`;

  return { xml, responseId, assertionId };
}

export function parseDom(xml: string): DomDocument {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

export function serializeDom(dom: DomDocument): string {
  return new XMLSerializer().serializeToString(dom);
}
