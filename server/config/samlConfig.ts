import * as env from './env';
import type { SamlConfigState, SamlStrategyConfig } from '../types/domain';
import { readSpCert, readSpKey } from '../saml/spKeys';
import * as persisted from './persistedConfig';

/**
 * A placeholder X.509 used when SAML_IDP_SKIP_CERT_VALIDATION=true and no
 * real cert is configured. passport-saml requires *some* cert string even
 * when signature validation is disabled.
 */
export const PLACEHOLDER_CERT =
  'MIIDXTCCAkWgAwIBAgIJALmVVuDWu4NYMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNVBAYTAkFV' +
  'MRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBM' +
  'dGQwHhcNMTYwODI3MjEzMjU3WhcNMjYwODI1MjEzMjU3WjBFMQswCQYDVQQGEwJBVTETMBEG' +
  'A1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIB' +
  'IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr1nYY1Qrll1ruB/FqlCRrr5nvuaqB+3A' +
  'M7bZR8qoIgLhRV6Oa0yW9zjh2yIc2ijkMvyJdaGqZ7xqFLJ9PpCBCZWnDQPU9C2tUbQNm0Ql' +
  'Y7yN7bVtGf3pUG1PTNLW/I9f5QGqDCRiGLdCJm8kMaQxl3xDYPPRuPBCJqvOsO8DwMuM1jf8' +
  'CXdxREPKqBvQQJZKJfLQJkqE6G8jBfLHg/QMf8j+QWQKcLWyWZ9iCwKCRnYFwjLhXCQlKH7m' +
  'JQx/D8QgU0ygChX7C+gp/q5PvyFvdFhUFX3LuTiPQ8lE5pG7e4LQRS7EHQhJXzQcQxOQgxGf' +
  'E3fcDFzVnPXdQZQgFwIDAQABo1AwTjAdBgNVHQ4EFgQU6CCWwRl2djnR5RfqT9RlYQ9TQJcw' +
  'HwYDVR0jBBgwFoAU6CCWwRl2djnR5RfqT9RlYQ9TQJcwDAYDVR0TBAUwAwEB/zANBgkqhkiG' +
  '9w0BAQsFAAOCAQEAZdJGEe3h5l8xPLhGrL0lXvZJ8qvmNRQFmVjUlPmO7VcRBP0P/Z0H1+1O' +
  'viHdCbk8H4gQRb3lKY3y6O1VXXT3GQj6LB5zUqMwdjXvL0CxSPJnXYqNVSVMwqGbN1xOgLzY' +
  'MH7bwjDfqQvQOVKJzQvZWJDcHgLOQlPQaYOhOBfHPZKYNBFqvLuKGfHLCQTMWMQxVzXLcf8W' +
  't0J0Y9dKYKFvHQqDJcLq/1Q8WjALpN1MxVPzJLvPbFVGELQNqWvBpCqPLlUMF7GqvDQfzUyQ' +
  'rqJhDKnKWK8P7HrBEZhNUvFxCHcL9XQJQR8dOc+ZnPTfHY3qvLkqJxOVPcPwBrRO0OPWsL9qhQ==';

/**
 * Build the passport-saml strategy config and decide whether SAML is
 * "configured enough" to register a real strategy.
 *
 * Reads SAML_IDP_ENTRY_POINT / SAML_IDP_CERT from process.env *at call time*
 * — bootstrap may have just populated them from an IdP metadata URL.
 */
export function buildSamlConfig(
  signAuthnRequests = persisted.read().signAuthnRequests ?? env.SAML_SP_SIGN_AUTHN_REQUESTS
): SamlConfigState {
  const entryPoint = process.env.SAML_IDP_ENTRY_POINT;
  const cert = process.env.SAML_IDP_CERT;
  const skipCertValidation = env.SAML_IDP_SKIP_CERT_VALIDATION;
  const hasCert = !!(cert && cert.length > 50);
  const isSamlConfigured = !!(entryPoint && (hasCert || skipCertValidation));

  const samlConfig: SamlStrategyConfig = {
    entryPoint: entryPoint || 'https://not-configured.example.com/saml',
    issuer: env.SAML_SP_ISSUER,
    callbackUrl: env.SAML_SP_CALLBACK_URL,
    idpCert: hasCert ? (cert as string) : PLACEHOLDER_CERT,
    wantAssertionsSigned: !skipCertValidation,
    wantAuthnResponseSigned: !skipCertValidation,
    validateInResponseTo: skipCertValidation ? 'never' : 'always',
    requestIdExpirationPeriodMs: 28_800_000,
    identifierFormat: null,
    acceptedClockSkewMs: -1,
    disableRequestedAuthnContext: true,
    forceAuthn: false,
    // HTTP-POST binding must not deflate (SAML spec) — the request body is
    // raw XML, base64-encoded. @node-saml deflates by default for both
    // bindings, so we set skipRequestCompression=true when using POST.
    // For Redirect, deflation is required (URL length limits).
    skipRequestCompression: signAuthnRequests,
    // Binding choice is gated on signing: Curity's SAML IdP only validates
    // the AuthnRequest signature when it is XML-embedded as <ds:Signature>
    // inside the request (HTTP-POST binding). With HTTP-Redirect binding the
    // signature is detached on the URL query string (SigAlg + Signature) and
    // Curity's RedirectDecoder drops those params — the signature never even
    // reaches its validator, and the request appears unsigned to the IdP.
    // So: signed → POST; unsigned → keep Redirect (smaller URL, no auto-submit).
    authnRequestBinding: signAuthnRequests ? 'HTTP-POST' : 'HTTP-Redirect',
    signAuthnRequests
  };

  if (signAuthnRequests) {
    // Only attach signing material when the toggle is on. Reading from disk
    // here (vs. holding a cached PEM in memory) keeps bring-your-own-keys
    // via SAML_SP_KEY_PATH / SAML_SP_CERT_PATH effective without a restart.
    try {
      samlConfig.privateKey = readSpKey();
      samlConfig.publicCert = readSpCert();
      samlConfig.signatureAlgorithm = 'sha256';
      samlConfig.digestAlgorithm = 'sha256';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️  signAuthnRequests=true but SP key/cert unreadable (${message}). ` +
          `AuthnRequest will be sent UNSIGNED. Check SAML_SP_KEY_PATH / SAML_SP_CERT_PATH.`
      );
      samlConfig.signAuthnRequests = false;
    }
  }

  return { samlConfig, isSamlConfigured, hasCert, skipCertValidation };
}
