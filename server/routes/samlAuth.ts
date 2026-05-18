import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import { decodeSAML } from '../saml/decode';
import * as messageStore from '../saml/messageStore';
import * as env from '../config/env';

const router = Router();

/**
 * passport-saml's metadata helper lives on a private `_saml` field. We type
 * the relevant bits here rather than reach for `any`. Same for `getAuthorizeUrlAsync`.
 */
interface SamlInternal {
  generateServiceProviderMetadata(
    decryptionCert: string | null,
    signingCert?: string | string[] | null
  ): string;
  getAuthorizeUrlAsync(
    relayState: string,
    host: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<string>;
}

interface SamlStrategyWithInternal {
  _saml?: SamlInternal;
}

function getSamlStrategy(): SamlStrategyWithInternal | undefined {
  const strategies = (passport as unknown as { _strategies: Record<string, unknown> })._strategies;
  return strategies['saml'] as SamlStrategyWithInternal | undefined;
}

// SAML SP metadata XML
router.get('/metadata', (req, res) => {
  try {
    const strategy = getSamlStrategy();
    if (!strategy?._saml) {
      console.error('SAML strategy not found in passport._strategies');
      res.status(500).type('text/plain').send('SAML strategy not initialized');
      return;
    }
    const metadata = strategy._saml.generateServiceProviderMetadata(null, null);
    res.type('application/xml').send(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating metadata:', error);
    res.status(500).type('text/plain').send('Error generating metadata: ' + message);
  }
});

// Initiate SAML login — capture the AuthnRequest into messageStore for the UI.
router.get('/login', async (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();

  try {
    const strategy = getSamlStrategy();
    if (strategy?._saml) {
      console.log('📤 Generating SAML Request...');
      const authUrl = await strategy._saml.getAuthorizeUrlAsync('', {}, {});
      if (authUrl && authUrl.includes('SAMLRequest=')) {
        const query = authUrl.split('?')[1] ?? '';
        const urlParams = new URLSearchParams(query);
        const samlRequest = urlParams.get('SAMLRequest');
        if (samlRequest) {
          console.log('📤 SAML Request captured, decoding...');
          const decoded = decodeSAML(samlRequest);
          messageStore.recordRequest({ timestamp, raw: samlRequest, decoded });
          console.log(`✅ SAML Request stored.`);
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error capturing SAML request:', message);
  }

  // `additionalParams` is a passport-saml-specific option not surfaced on
  // passport's base AuthenticateOptions type — cast to satisfy the overload.
  const authenticateOptions = { additionalParams: req.query } as Parameters<
    typeof passport.authenticate
  >[1];
  passport.authenticate('saml', authenticateOptions)(req, res, (err: unknown) => {
    if (err) next(err);
  });
});

interface AuthenticatedUser {
  sessionIndex?: string;
  [key: string]: unknown;
}

// ACS callback
router.post('/callback', (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const samlResponse = (req.body as { SAMLResponse?: string }).SAMLResponse;

  if (samlResponse) {
    console.log('📩 SAML Response received, decoding...');
    const decoded = decodeSAML(samlResponse);
    messageStore.recordResponse({ timestamp, raw: samlResponse, decoded });
    console.log(`✅ SAML Response stored.`);
  } else {
    console.log('⚠️  No SAMLResponse in request body');
  }

  passport.authenticate('saml', (err: Error | null, user?: AuthenticatedUser | false) => {
    if (err) {
      console.error('SAML authentication error:', err);
      res.redirect(`${env.CLIENT_ORIGIN}/?error=${encodeURIComponent(err.message)}`);
      return;
    }
    if (!user) {
      res.redirect(`${env.CLIENT_ORIGIN}/?error=authentication_failed`);
      return;
    }

    messageStore.recordAssertion({ timestamp, user, sessionIndex: user.sessionIndex });

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        res.redirect(`${env.CLIENT_ORIGIN}/?error=${encodeURIComponent(loginErr.message)}`);
        return;
      }
      res.redirect(`${env.CLIENT_ORIGIN}/?success=true`);
    });
  })(req, res, next);
});

// Local logout, then redirect to IdP logout (if configured).
router.get('/logout', (req, res) => {
  const idpLogoutUrl = env.SAML_IDP_LOGOUT_REDIRECT_URL;
  req.logout((err) => {
    if (err) console.error('❌ Logout error:', err.message);
    req.session.destroy(() => {
      if (idpLogoutUrl) {
        console.log('🔓 Redirecting to IDP logout:', idpLogoutUrl);
        res.redirect(idpLogoutUrl);
      } else {
        console.log('⚠️  No IDP logout URL configured, local session destroyed only');
        res.redirect(env.CLIENT_ORIGIN);
      }
    });
  });
});

// IdP-initiated logout callback target.
router.get('/logout/callback', (req, res) => {
  console.log('✅ IDP logout callback received');
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) console.error('❌ Logout callback error:', err.message);
      req.session.destroy(() => res.redirect(`${env.CLIENT_ORIGIN}/?logout=true`));
    });
  } else {
    res.redirect(`${env.CLIENT_ORIGIN}/?logout=true`);
  }
});

export default router;
