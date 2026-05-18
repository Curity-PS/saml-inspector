import { Router } from 'express';
import { readCert } from '../unsolicited/keys';
import { sendUnsolicited, defaults } from '../unsolicited/handler';
import * as messageStore from '../saml/messageStore';
import type { UnsolicitedInput } from '../unsolicited/types';

const router = Router();

// Defaults the UI form pre-fills with.
router.get('/defaults', (req, res) => {
  const d = defaults();
  res.json({
    acsUrl: d.acsUrl,
    audience: d.audience,
    idpEntityId: d.idpEntityId,
    nameId: d.nameId,
    clientId: d.clientId,
    clientSecret: d.clientSecret,
    redirectUri: d.redirectUri,
    scope: d.scope
  });
});

// IdP signing cert PEM for one-time registration on the host Curity.
router.get('/cert', (req, res) => {
  try {
    res.type('application/x-pem-file').send(readCert());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  }
});

// Registered OAuth redirect target. Normally not reached by a browser —
// the server captures the code from the 303 server-side. This route exists
// purely so the registered redirect_uri is a real URL owned by this app.
router.get('/callback', (req, res) => {
  const escapedQuery = req.url.replace(
    /[<>&]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c
  );
  res.type('text/html').send(`<!doctype html>
<html><body style="font-family: system-ui; padding: 2rem; max-width: 640px;">
<h2>Unsolicited SAML OAuth callback</h2>
<p>This URL is the registered <code>redirect_uri</code> for the
<code>saml2_unsolicited_client</code> OAuth client. The diagnostic app captures the
<code>code</code> server-side from the 303 redirect, so this page is normally not
reached by a browser.</p>
<p>Query string was: <code>${escapedQuery}</code></p>
<p><a href="http://localhost:3000">Back to diagnostic app</a></p>
</body></html>`);
});

// The big-button endpoint — builds, signs, POSTs, follows the chain.
router.post('/send', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const input = (req.body as UnsolicitedInput) ?? {};
    const result = await sendUnsolicited(input, {
      onSentXml: (xml) => {
        messageStore.recordResponse({
          timestamp,
          raw: Buffer.from(xml, 'utf8').toString('base64'),
          decoded: { xml, prettified: xml.replace(/></g, '>\n<') },
          source: 'unsolicited'
        });
        console.log(`📤 Unsolicited SAML Response built (${xml.length} bytes)`);
      }
    });
    if (result.ok) {
      console.log(
        `✅ Unsolicited end-to-end OK — tokens received (id_token sub=${result.decodedIdToken?.sub ?? '?'})`
      );
    } else {
      console.log(
        `⚠️  Unsolicited flow failed at step ${result.failedStep} (${result.failedStepName}) — HTTP ${result.status}`
      );
    }
    res.json(result);
  } catch (err) {
    console.error('❌ Unsolicited send error:', err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    res.status(500).json({ ok: false, error: message, stack });
  }
});

export default router;
