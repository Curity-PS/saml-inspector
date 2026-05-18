/**
 * Centralized typed reads from process.env with their defaults.
 * Importing from here (instead of touching process.env all over the place)
 * makes it obvious which env vars the server depends on.
 */

import { randomBytes } from 'crypto';

export const PORT: number = Number(process.env.PORT) || 3001;
// Ephemeral per-process secret for express-session cookie signing. Not
// configurable: this is a localhost test tool and a fresh secret per restart
// is preferable to a hardcoded default.
export const SESSION_SECRET: string = randomBytes(32).toString('hex');
export const CLIENT_ORIGIN: string = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// SAML SP / IdP — all optional; SAML can boot in "not configured" mode.
export const SAML_IDP_METADATA_URL: string | null =
  process.env.SAML_IDP_METADATA_URL || null;
export const SAML_IDP_ENTRY_POINT: string | null =
  process.env.SAML_IDP_ENTRY_POINT || null;
export const SAML_IDP_CERT: string | null = process.env.SAML_IDP_CERT || null;
export const SAML_IDP_SKIP_CERT_VALIDATION: boolean =
  process.env.SAML_IDP_SKIP_CERT_VALIDATION === 'true';
export const SAML_IDP_LOGOUT_REDIRECT_URL: string | null =
  process.env.SAML_IDP_LOGOUT_REDIRECT_URL || null;

export const SAML_SP_ISSUER: string =
  process.env.SAML_SP_ISSUER || `http://localhost:${PORT}/saml/metadata`;
export const SAML_SP_CALLBACK_URL: string =
  process.env.SAML_SP_CALLBACK_URL || `http://localhost:${PORT}/saml/callback`;
