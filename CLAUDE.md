# SAML Inspector

SAML Inspector is a diagnostic web application for testing and debugging SAML 2.0 authentication flows with a SAML Identity Provider (typically Curity Identity Server). Drives **two** flows:

1. **SP-initiated SAML** — standard Passport-based "Sign In with SAML" against a SAML IdP.
2. **Unsolicited SAML Response** — hand-crafts, signs and POSTs an unsolicited SAML 2.0 Response at a Curity SAML2 authenticator (`saml2-sp`) and drives the OAuth code exchange end-to-end. JS port of the standalone Python tool at `../saml-unsolicited-tester/`.

## Tech Stack

- **Language:** TypeScript end-to-end (strict mode, `noUncheckedIndexedAccess`). Server runs via `tsx` in dev, compiled to `server/dist/` by `tsc` for production. Client is compiled by Vite.
- **Backend:** Node.js + Express, Passport.js with @node-saml/passport-saml, express-session, xml2js, **xml-crypto** (SAML signing), **node-forge** (RSA keypair + X.509 generation), **@xmldom/xmldom** (DOM parsing)
- **Frontend:** React 18 (functional components + hooks), Tailwind 4, Radix UI primitives, lucide-react icons, Axios
- **Build:** Vite (frontend), tsx + nodemon (backend dev), tsc (backend prod build), concurrently (parallel dev servers)
- **Tests:** Vitest + supertest. Co-located `*.test.ts` beside source. Run with `npm test`.

## Project Structure

```
server/
├── index.ts                  # Bootstrap entry: load env → init config → mount app → listen
├── app.ts                    # createApp(): wires Express middleware + routers (no listen, no env mutation)
├── state.ts                  # Mutable {samlConfig, isSamlConfigured} populated at boot, read by routes
├── config/
│   ├── env.ts                # Centralized typed env access (PORT, SAML_*, etc.)
│   ├── samlConfig.ts         # buildSamlConfig() + PLACEHOLDER_CERT — decides "configured enough" gate
│   └── bootstrap.ts          # loadIdpMetadata + ensureUnsolicitedKeys (startup side effects)
├── saml/
│   ├── strategy.ts           # registerSamlStrategy() (real or stub)
│   ├── metadata.ts           # parseMetadata (idp|sp overloads) + fetchMetadata
│   ├── decode.ts             # decodeSAML — base64 + inflate + pretty-print
│   └── messageStore.ts       # In-memory captured-messages store (requests/responses/assertions)
├── routes/
│   ├── diagnostic.ts         # /api/health, /api/session, /api/config, /api/messages, /api/decode, /api/parse-metadata, /api/idp-status
│   ├── samlAuth.ts           # /saml/login, /saml/callback, /saml/metadata, /saml/logout, /saml/logout/callback
│   └── unsolicited.ts        # /api/unsolicited/{send,defaults,cert,callback}
├── lib/
│   └── httpClient.ts         # fetchText + headCheck — shared insecure http/https helpers
├── unsolicited/              # Unsolicited-flow backend, independent of passport-saml
│   ├── keys.ts               # ensureKeysExist — 2048-bit RSA + self-signed X.509 on first boot
│   ├── buildResponse.ts      # Builds unsigned <samlp:Response>
│   ├── sign.ts               # signAssertion + signResponse with xml-crypto; reposition after Issuer
│   ├── handler.ts            # sendUnsolicited — orchestrates the 3-step flow
│   ├── oauthChain.ts         # postSamlResponse → followAutoSubmitForm → exchangeCodeForTokens
│   ├── http/
│   │   ├── cookieJar.ts      # CookieJar — parses Set-Cookie, reapplies on next request
│   │   └── request.ts        # fetch wrapper with per-call NODE_TLS_REJECT_UNAUTHORIZED scope
│   └── types.ts              # UnsolicitedInput, UnsolicitedResult (discriminated ok-union)
├── types/
│   └── domain.ts             # Cross-module types (SamlStrategyConfig, CapturedRequest/Response/Assertion, etc.)
└── keys/                     # Generated IdP signing keypair (gitignored)

client/src/
├── App.tsx                   # Tab orchestrator — mounts all tabs, toggles `hidden`
├── main.tsx                  # ReactDOM.createRoot entry
├── components/
│   ├── tabs/
│   │   ├── OverviewTab.tsx        # Flow chooser cards + SetupChecklist (default landing)
│   │   ├── SpInitiatedTab.tsx     # Dashboard + SessionInfo + ConfigPanel
│   │   ├── UnsolicitedTab.tsx     # Orchestrates form/result/error; owns mutable state
│   │   └── InspectorTab.tsx       # Flow filter (All/SP-Init/Unsolicited) + MessageViewer
│   ├── Header.tsx                 # Top banner with IdP-reachable indicator
│   ├── StatusStrip.tsx            # Sticky strip: SAML configured / IdP reachable / cert
│   ├── TabBar.tsx                 # Hash-routed tab buttons, Inspector count badge
│   ├── AlertBanner.tsx            # Error/success banner with optional `action` link
│   ├── Dashboard.tsx              # Auth status + Sign In/Out (SP-Initiated tab)
│   ├── SessionInfo.tsx            # User attributes + session index
│   ├── ConfigPanel.tsx            # SAML strategy options (entry point, cert, …) inline editor
│   ├── MessageViewer.tsx          # Tabbed list of Requests/Responses/Assertions/Decoder + source badges
│   ├── SetupChecklist.tsx         # 2 auto + 2 user-confirmed items grouped by flow
│   ├── HostCuritySetup.tsx        # Exports HostCuritySetupCert + HostCuritySetupRedirect + combined
│   ├── ParametersForm.tsx         # Editable Unsolicited input fields + submit button
│   ├── UnsolicitedResult.tsx      # Stepper + outcome banner + trace + tokens + ID-token claims
│   ├── FlowStepper.tsx            # Horizontal step indicator (pending/active/complete/failed)
│   ├── CollapsibleSection.tsx     # Bordered card with click-to-toggle body
│   ├── CopyButton.tsx             # Clipboard-copy button with "Copied" flash
│   └── ui/                        # shadcn primitives (button, card, input, …)
├── api/                      # Typed axios layer — every server endpoint has one function
│   ├── client.ts             # Shared axios instance
│   ├── session.ts, config.ts, messages.ts, idpStatus.ts, unsolicited.ts
├── hooks/
│   ├── useDiagnosticData.ts  # session/config/messages fetch + isInitialLoad guard
│   ├── useIdpStatus.ts       # 30s polling of /api/idp-status
│   ├── useTab.ts             # Hash-based tab state (push + replace + popstate sync)
│   └── useLocalStorage.ts    # Persists SetupChecklist user-confirmed items
├── types/
│   └── api.ts                # Client-side mirror of server payload shapes
└── lib/utils.ts              # cn() classname helper

scripts/extract-cert.ts       # Utility to extract certificate from IDP metadata
```

## Commands

```bash
npm run dev          # Start both server (:3001) and client (:3000) concurrently
npm run server       # Start Express server only (nodemon + tsx)
npm run client       # Start React dev server only
npm run build        # Build server (tsc → server/dist/) AND client (vite → client/dist/)
npm run build:server # Server-only TS compile
npm run build:client # Client-only Vite build
npm run typecheck    # tsc --noEmit on both server + client tsconfigs
npm test             # Vitest one-shot
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Vitest with v8 coverage
npm start            # Run compiled production server (node server/dist/index.js)
./setup.sh           # One Time Setup In Curity setup (install deps, create .env)
```

## Configuration

All config is in `.env` (see `.env.example` for template). Key variables:

SP-initiated:
- `PORT` - Server port (default: 3001)
- `SAML_SP_ISSUER` - SP entity ID
- `SAML_SP_CALLBACK_URL` - SAML assertion consumer service URL
- `SAML_IDP_METADATA_URL` - Auto-configure from IDP metadata (recommended)
- `SAML_IDP_ENTRY_POINT` / `SAML_IDP_CERT` - Manual IDP configuration fallback
- `SAML_IDP_LOGOUT_REDIRECT_URL` - Curity IDP logout endpoint with redirect back to SP
- `SAML_IDP_SKIP_CERT_VALIDATION` - Skip certificate validation for testing

Unsolicited test (all have sensible defaults):
- `UNSOLICITED_ACS_URL` - host SP's saml2-sp ACS endpoint
- `UNSOLICITED_AUDIENCE` - default `<saml:Audience>`
- `UNSOLICITED_IDP_ENTITY_ID` - `<saml:Issuer>` used in the Response/Assertion (must match what host SP trusts)
- `UNSOLICITED_OAUTH_PROFILE_ID` / `UNSOLICITED_RESUME_PATH` - bootstrap params Curity's `AuthenticationController` needs
- `UNSOLICITED_CLIENT_ID` / `UNSOLICITED_CLIENT_SECRET` / `UNSOLICITED_REDIRECT_URI` / `UNSOLICITED_SCOPE` - OAuth client for code exchange
- `UNSOLICITED_TOKEN_URL` - override if not derivable from ACS host
- `UNSOLICITED_KEY_PATH` / `UNSOLICITED_CERT_PATH` - override the auto-generated keypair (e.g. to A/B against `../saml-unsolicited-tester/keys/`)

## Architecture

- **Backend:** Modular Express app, side-effect free `createApp()` in `app.ts`. Bootstrap in `index.ts` (loadIdpMetadata → ensureUnsolicitedKeys → buildSamlConfig → registerSamlStrategy → listen). Mutable SAML state lives in `state.ts` (set at bootstrap, read by routes). Routes split by domain (`diagnostic`, `samlAuth`, `unsolicited`). SAML messages are stored in-memory in `saml/messageStore.ts`. The unsolicited-test backend in `server/unsolicited/` is independent of passport-saml — it builds, signs and POSTs SAML Responses with `xml-crypto` directly.
- **Frontend:** React SPA with a hash-routed tab UI (`useTab`, `#/overview` / `#/sp-initiated` / `#/unsolicited` / `#/inspector`). `App.tsx` mounts all four tabs at startup and toggles visibility via the HTML `hidden` attribute (mount-all-then-hide) so panel-local state survives tab switches. Server state lives in `useDiagnosticData` (session/config/messages + refetch with an `isInitialLoad` guard); `useIdpStatus` polls reachability every 30s; `useLocalStorage` persists the user-confirmed items on the Overview's `SetupChecklist`. Every server endpoint has a typed wrapper in `client/src/api/*`. Vite proxies `/api` and `/saml` to the backend. The unsolicited flow's `result` state lives **inside `UnsolicitedTab`**, not lifted — so the parent must not unmount the tab content during refetches OR tab switches (see Gotchas).
- **Tests:** Vitest unit + supertest integration suite, co-located beside source as `*.test.ts` (65 tests, ~650ms). High coverage on the SAML wire-format helpers (sign 96%, metadata 96%, buildResponse 92%, samlConfig 100%, cookieJar 100%). Manual UI testing still required for the full unsolicited end-to-end (needs a live Curity).

## API Routes

SP-initiated + diagnostic:
- `GET /api/health` - Health check + config status
- `GET /api/session` - Current user session
- `GET|POST /api/config` - Read/update SAML config
- `GET /api/idp-status` - Check if IDP endpoint is reachable
- `GET /api/messages` / `DELETE /api/messages` - Captured SAML messages
- `POST /api/decode` - Decode Base64 SAML messages
- `POST /api/parse-metadata` - Parse SAML metadata XML
- `GET /saml/metadata` - SP metadata XML
- `GET /saml/login` - Initiate SAML authentication
- `POST /saml/callback` - SAML assertion consumer service
- `GET /saml/logout` / `GET /saml/logout/callback` - SLO

Unsolicited test:
- `POST /api/unsolicited/send` - Build + sign + POST unsolicited Response, drive OAuth chain, return tokens
- `GET  /api/unsolicited/defaults` - Defaults the UI pre-fills the form with
- `GET  /api/unsolicited/cert` - IdP signing cert PEM (for one-time registration on the host SP)
- `GET  /api/unsolicited/callback` - Registered OAuth redirect_uri target. Normally not reached by a browser — the server captures the code from the 303 server-side.

## Conventions

- TypeScript everywhere; strict mode + `noUncheckedIndexedAccess`. No `any` unless wrapping a genuinely-untyped third-party API (e.g. `passport._strategies['saml']._saml` private surface).
- camelCase for functions/variables, PascalCase for React components and exported types/interfaces.
- Named exports for multi-symbol modules; `export default router` for Express routers.
- Co-located tests: `foo.ts` ↔ `foo.test.ts` in the same directory.
- Cross-module types live in `server/types/domain.ts` (server) and `client/src/types/api.ts` (client). The client mirror is maintained by hand — no shared workspace.
- Hyphenated CSS class names (e.g., `card-elevated`, `message-header`).
- All React components are functional with hooks.
- Commit messages use `feat:` / `fix:` / `chore:` / `refactor:` prefixes.

## Non-obvious gotchas (cost real debugging time — do not undo)

### Unsolicited SAML — wire format

1. **Bootstrap params go in the form BODY, not the URL query.** Curity's `AuthenticationController` (`/authn/authenticate/*`) gates dispatch to the SAML2 handler on `serviceProviderId`/`client_id` being present in the form body. Putting them in the URL fails with HTTP 400 `missing_parameters`. See `server/unsolicited/handler.ts` and `oauthChain.ts::postSamlResponse`.
2. **`<ds:Signature>` placement.** SAML 2.0 schema requires Signature **immediately after `<saml:Issuer>`**. `xml-crypto` appends it as the last child by default — we move it in `sign.ts::repositionSignatureAfterIssuer`. Do not remove this function. Asserted by `sign.test.ts`.
3. **Sign assertion first, then response.** The response signature must cover the canonical form of the already-signed assertion. Reversing the order produces a digest mismatch on Curity. See `handler.ts::sendUnsolicited`. Asserted by `sign.test.ts` (nested-signatures test).
4. **Algorithms must be exact:** RSA-SHA256 + exclusive C14N + enveloped transform + SHA256 digest. Reference URI is `#<element-ID>`. Mirrors the Python tester at `../saml-unsolicited-tester/`.
5. **Session cookies travel across hops.** `unsolicited/http/cookieJar.ts::CookieJar` parses `Set-Cookie` from each Curity response and reapplies them on the next request. Required for `/dev/oauth/authorize` to find the SSO session.
6. **The auto-submit form is POST, not GET** — Curity returns `<form method="post">` with a hidden CSRF `token` input. `oauthChain.ts::followAutoSubmitForm` branches on method.
7. **Self-signed TLS.** `NODE_TLS_REJECT_UNAUTHORIZED='0'` is set narrowly inside `unsolicited/http/request.ts::request` (saved and restored around each fetch). Keep the scope narrow; don't promote to the whole process.
8. **OAuth `redirect_uri` is a real URL on this app.** Defaults to `http://localhost:3001/api/unsolicited/callback`. That route exists so the registered `redirect_uri` is legitimate, but the code is captured server-side from the 303 `Location` header — the browser never lands on `/callback` in the default flow.

### Audience-validation gap (the original motivation)

Curity's SAML2 SP plugin parses `<AudienceRestriction>` but does **not** validate it. The UI's "Audience" field lets you set any value — Curity will still mint tokens for `sub: johndoe`. Cross-references are in `../saml-unsolicited-tester/CLAUDE.md` ("Repo cross-references" section).

### React state gotcha — don't unmount panels during refetches OR tab switches

Two distinct triggers, same symptom (UnsolicitedTab loses its `result` state and tokens vanish after a successful POST):

1. **Refetch path.** The `useDiagnosticData` hook (`client/src/hooks/useDiagnosticData.ts`) exposes a `refetch()` that's called on initial mount **and** as a refresh hook from children (e.g. `UnsolicitedTab`'s `onMessagesChanged`). It must **not** flip `loading=true` on subsequent calls — when it did, `App.tsx`'s `if (loading) return <dots/>` branch unmounted `<main>` and wiped `UnsolicitedTab`'s local `result`. The guard `const isInitialLoad = session === null;` inside `refetch` is load-bearing — only the very first call shows the spinner.

2. **Tab-switch path.** `App.tsx` renders all four tabs simultaneously and toggles visibility via `<div hidden={tab !== '...'}>` (mount-all-then-hide). A "cleanup" refactor that switches to conditional rendering (`{tab === 'unsolicited' && <UnsolicitedTab/>}`) would unmount `UnsolicitedTab` on every tab change and re-introduce the disappearing-tokens bug.

If a refactor lifts `result` out of `UnsolicitedTab` into App-level state, both safeguards can be removed.

## One-time host Curity setup (for the unsolicited flow)

On first boot, `ensureKeysExist()` writes `server/keys/idp-signing.{key,crt}.pem`. Two manual config changes are needed on the host Curity:

1. Register the cert (UI shows "Copy PEM" button) on the `saml2-sp` authenticator's signature-verification keys.
2. Add `http://localhost:3001/api/unsolicited/callback` (the value of `UNSOLICITED_REDIRECT_URI`) as a `<redirect-uri>` on the `saml2_unsolicited_client` OAuth client.

Shortcut for testing without re-registering: point `UNSOLICITED_KEY_PATH` + `UNSOLICITED_CERT_PATH` at `../saml-unsolicited-tester/keys/test-idp-signing.{key,crt}.pem` (already trusted as `unsolicited-tester-idp-sign-ver-key`) and set `UNSOLICITED_REDIRECT_URI=http://localhost/callback`.
