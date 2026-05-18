import * as env from './env';
import type { SamlConfigState, SamlStrategyConfig } from '../types/domain';

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
export function buildSamlConfig(): SamlConfigState {
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
    skipRequestCompression: false,
    authnRequestBinding: 'HTTP-Redirect'
  };

  return { samlConfig, isSamlConfigured, hasCert, skipCertValidation };
}
