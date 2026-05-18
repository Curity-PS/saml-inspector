import passport from 'passport';
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import type { Profile, VerifiedCallback } from '@node-saml/passport-saml';
import type { SamlConfigState } from '../types/domain';

/**
 * Register the SAML strategy (or a stub that fails cleanly when SAML
 * isn't configured). Logs a banner summarizing the chosen mode.
 */
export function registerSamlStrategy({
  samlConfig,
  isSamlConfigured,
  hasCert,
  skipCertValidation
}: SamlConfigState): void {
  if (isSamlConfigured) {
    // Diagnostic tool: pass the SAML profile straight through as the user
    // object. Same verify function is registered for both signon and logout
    // — the runtime only invokes logoutVerify on a full SLO flow.
    const verify = (profile: Profile | null, done: VerifiedCallback) => {
      done(null, profile ?? undefined);
    };
    passport.use(
      new SamlStrategy(
        samlConfig as unknown as ConstructorParameters<typeof SamlStrategy>[0],
        verify,
        verify
      )
    );

    if (hasCert) {
      console.log('✅ SAML configured with certificate validation');
    } else if (skipCertValidation) {
      console.log('⚠️  SAML configured WITHOUT certificate validation (testing mode only)');
      console.log('   This uses a placeholder certificate and will NOT validate signatures');
      console.log('   Add SAML_IDP_CERT in .env for production use');
    }
    console.log(`   Entry Point: ${samlConfig.entryPoint}`);
    console.log(`   Issuer: ${samlConfig.issuer}`);
    console.log(`   Callback URL: ${samlConfig.callbackUrl}`);
    return;
  }

  console.warn('\n⚠️  WARNING: SAML not fully configured!');
  console.warn('   Please edit the .env file with your Curity Identity Server settings.');
  console.warn('   Required: SAML_IDP_ENTRY_POINT');
  console.warn('   Required: SAML_IDP_CERT (or set SAML_IDP_SKIP_CERT_VALIDATION=true for testing)');
  console.warn('   The server will start but SAML authentication will NOT work until configured.\n');

  // Stub strategy so /saml/* routes fail with a clear message instead of
  // throwing "unknown strategy" errors. `this.fail()` comes from passport's
  // StrategyBase methods, which are mixed into the strategy at registration
  // time — we declare it on the function shape so TS knows it's there.
  function authenticateStub(this: { fail(message: string): void }): void {
    this.fail('SAML not configured. Please set SAML_IDP_ENTRY_POINT in .env file');
  }
  passport.use('saml', {
    name: 'saml',
    authenticate: authenticateStub
  } as passport.Strategy);
}
