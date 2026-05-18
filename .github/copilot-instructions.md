# SAML Inspector

SAML Inspector is a diagnostic web application for testing and debugging SAML 2.0 authentication flows with a SAML Identity Provider (typically Curity Identity Server). Drives **two** flows:

1. **SP-initiated SAML** — standard Passport-based "Sign In with SAML" against a SAML IdP.
2. **Unsolicited SAML Response** — hand-crafts, signs and POSTs an unsolicited SAML 2.0 Response at a Curity SAML2 authenticator (`saml2-sp`) and drives the OAuth code exchange end-to-end.

## Commands

```bash
npm run dev       # Start both server (:3001) and client (:3000) concurrently
npm run server    # Start Express server only (with nodemon)
npm run client    # Start React dev server only
npm run build     # Build React frontend for production
npm start         # Run production server
./setup.sh        # One Time Setup In Curity setup (install deps, create .env)
```

No tests exist — the project relies on manual testing through the UI.

## Architecture

- **Backend** (`server/index.js`): Single Express file handles all SP-initiated SAML logic (Passport.js + `@node-saml/passport-saml`), message capture (in-memory), and API endpoints. Supports auto-config from IDP metadata URL or manual `.env` config.
- **Unsolicited test backend** (`server/unsolicited/`): Independent of passport-saml. Builds, signs and POSTs SAML Responses with `xml-crypto` directly, then drives the OAuth code exchange (`postSamlResponse → followAutoSubmitForm → exchangeCodeForTokens`). Has its own `CookieJar` for session continuity across Curity hops.
- **Frontend** (`client/src/`): React 18 SPA, state lifted to `App.jsx`. Vite proxies `/api` and `/saml` routes to the backend. Components are feature-based (`Dashboard`, `ConfigPanel`, `MessageViewer`, `UnsolicitedPanel`).
- **Auto-generated keypair**: On first boot, `server/unsolicited/keys.js::ensureKeysExist()` writes a 2048-bit RSA keypair + self-signed X.509 cert to `server/keys/` (gitignored).

## Conventions

- Plain JavaScript throughout — no TypeScript
- camelCase for functions/variables, PascalCase for React components
- Hyphenated CSS class names (e.g., `card-elevated`, `message-header`)
- All React components are functional with hooks
- Commit messages use `feat:` / `fix:` prefixes
- Tailwind 4 + Radix UI primitives for the frontend

## Non-obvious gotchas (cost real debugging time — do not undo)

### Unsolicited SAML — wire format

1. **Bootstrap params go in the form BODY, not the URL query.** Curity's `AuthenticationController` gates dispatch on `serviceProviderId`/`client_id` being in the form body. URL query params fail with HTTP 400. See `handler.js` and `oauthChain.js::postSamlResponse`.
2. **`<ds:Signature>` placement.** SAML 2.0 schema requires Signature immediately after `<saml:Issuer>`. `xml-crypto` appends it as the last child — `sign.js::repositionSignatureAfterIssuer` moves it. Do not remove.
3. **Sign assertion first, then response.** Reversing the order produces a digest mismatch on Curity.
4. **Algorithms must be exact:** RSA-SHA256 + exclusive C14N + enveloped transform + SHA256 digest. Reference URI is `#<element-ID>`.
5. **Session cookies travel across hops.** `oauthChain.js::CookieJar` parses `Set-Cookie` from each Curity response and reapplies on the next request.
6. **The auto-submit form is POST, not GET** — `followAutoSubmitForm` branches on method.
7. **Self-signed TLS.** `NODE_TLS_REJECT_UNAUTHORIZED='0'` is set narrowly inside `oauthChain.js::request` (saved/restored around each fetch). Don't promote to the whole process.
8. **OAuth `redirect_uri` is a real route** (`/api/unsolicited/callback`) so the registered URI is legitimate, but the code is captured server-side from the 303 `Location` header — the browser never lands there.

### React state — don't unmount panels during refetches

`App.jsx::fetchData` is called on initial mount **and** as a refresh hook from children (e.g. `UnsolicitedPanel`'s `onMessagesChanged`). It must **not** flip `loading=true` on subsequent calls — doing so unmounts `<main>`, which destroys `UnsolicitedPanel`'s local `result` state and makes tokens vanish from the UI. The guard `const isInitialLoad = session === null;` is load-bearing. Only remove it if `result` is lifted into App-level state.
