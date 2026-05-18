# SAML Inspector

A diagnostic web app for testing and debugging SAML 2.0 authentication flows against a Curity Identity Server. Use it to inspect every SAML message on the wire, test your IdP's signature handling, and exercise both directions of SAML 2 SSO from one tool.

It drives **two flows**:

- **SP-Initiated** — standard "Sign In with SAML" via Passport + `@node-saml/passport-saml`.
- **Unsolicited (IdP-Initiated)** — hand-crafts, signs and POSTs an unsolicited SAML 2.0 Response at a Curity `saml2-sp` authenticator, then drives the OAuth code exchange end-to-end.

## Quick Start

```bash
# 1. Install (server + client)
npm install

# 2. Configure
cp .env.example .env
# edit .env — at minimum point SAML_IDP_METADATA_URL at your Curity, e.g.:
# SAML_IDP_METADATA_URL=https://localhost:8443/saml/sso/metadata

# 3. Run
npm run dev
```

Then open **http://localhost:3000**. Frontend is on `:3000`, backend on `:3001`, and SP metadata is served at `:3001/saml/metadata`.

**Prerequisites:** Node.js v18+, npm, a Curity Identity Server reachable from this host, and a working understanding of SAML 2.0.

<details>
<summary>Manual IdP configuration (no metadata URL)</summary>

If your IdP doesn't expose metadata, set the entry point and certificate directly:

```env
SAML_IDP_ENTRY_POINT=https://localhost:8443/saml/sso
SAML_IDP_CERT=MIID...   # IdP cert, single-line base64, no BEGIN/END markers
SAML_IDP_LOGOUT_REDIRECT_URL=https://localhost:8443/dev/authn/authenticate/logout?redirect_uri=http://localhost:3001/saml/logout/callback
SAML_IDP_SKIP_CERT_VALIDATION=false
```

</details>

<details>
<summary>Other useful scripts</summary>

```bash
npm run typecheck       # tsc --noEmit on server + client
npm test                # Vitest one-shot
npm run test:watch      # Vitest in watch mode
npm run test:coverage   # Vitest v8 coverage report
npm run build           # tsc server + Vite client build
npm start               # Run the compiled production server
```

</details>

## Features

- **SAML Service Provider** via Passport + `@node-saml/passport-saml`.
- **Unsolicited SAML Response tester** — single click renders access / id / refresh tokens, decoded `id_token` claims, the HTTP trace, and the sent XML. Form fields for audience, NameID, OAuth client, scope, plus sign-assertion / sign-response toggles.
- **Real-time SAML message capture** with syntax-highlighted XML, per-message flow badges, and a flow filter.
- **Auto-configuration from IdP metadata URL** (entry point + cert fetched at startup).
- **In-UI config editor** for the SAML strategy, with metadata import.
- **Base64 decoder** for ad-hoc inspection of pasted SAML messages.

## Usage

The app has four hash-routed tabs (`#/overview` / `#/sp-initiated` / `#/unsolicited` / `#/inspector`). Tab state survives refreshes and browser back/forward.

| Tab | What it does |
|---|---|
| **Overview** | Landing page. Flow chooser cards + per-flow setup checklist (`localStorage`-persisted for user-confirmed items). |
| **SP-Initiated** | Sign In / Out, session info, and the **SAML Configuration** editor (it governs this flow only). |
| **Unsolicited** | Parameter editor + sign toggles, then result panel with stepper, HTTP trace, tokens, decoded `id_token` claims. |
| **Inspector** | Captured Requests / Responses / Assertions + standalone Base64 Decoder. Per-message flow badges and an All / SP-Initiated / Unsolicited filter. |

### SP-Initiated walkthrough

1. Open http://localhost:3000 — you land on **Overview**.
2. Click **"Open SP-Initiated"** (or pick the **SP-Initiated** tab directly).
3. Click **"Sign In with SAML"** and complete login at the Curity IdP.
4. You land back on **SP-Initiated** with session info populated; the success banner offers **"View captured messages →"** to jump to the Inspector.

### Unsolicited walkthrough

> **First time?** Two host-Curity config steps are required — see [Curity-side setup](#curity-side-setup) below.

1. Open the **Unsolicited** tab.
2. Adjust parameters if needed — NameID, audience, OAuth client, sign-assertion / sign-response toggles.
3. Click **"Send Unsolicited Response"**.
4. The result panel shows a step indicator, success/failure banner, HTTP trace, and tokens. **"Inspect XML →"** jumps to the Inspector for the captured Response.

### Inspector tab

Four sub-tabs:

- **Requests** — SAML `AuthnRequest`s sent to the IdP (all SP-Initiated).
- **Responses** — SAML Responses received (filter shows SP-Initiated vs. Unsolicited).
- **Assertions** — parsed user attributes + session index (all SP-Initiated).
- **Decoder** — paste a Base64-encoded SAML message to decode it on the fly.

### Updating SAML configuration in-app

`SAML Configuration` lives on the **SP-Initiated** tab. Click **Edit**, then either **Import from Metadata** (paste XML — fields auto-extract) or fill in **Manual Entry** (entry point, SP entity ID, callback URL, IdP cert). Click **Save Configuration**.

## SAML flows

### SP-Initiated flow

The classic browser-redirect SAML 2 SSO. The browser is the bus between SP and IdP — every protocol message travels through it via HTTP-Redirect or HTTP-POST bindings.

<details>
<summary>Sequence diagram</summary>

```
┌─────────────┐                  ┌──────────────┐                  ┌─────────────┐
│   Browser   │                  │ Diagnostic   │                  │   Curity    │
│             │                  │   Tool (SP)  │                  │    (IDP)    │
└──────┬──────┘                  └──────┬───────┘                  └──────┬──────┘
       │                                │                                 │
       │  1. Click Login                │                                 │
       ├───────────────────────────────>│                                 │
       │                                │                                 │
       │                                │  2. Generate AuthnRequest       │
       │                                │     (Base64 + Deflate)          │
       │                                │                                 │
       │  3. Redirect with SAMLRequest  │                                 │
       │<───────────────────────────────┤                                 │
       │                                │                                 │
       │  4. GET /saml/sso?SAMLRequest=...                               │
       ├─────────────────────────────────────────────────────────────────>│
       │                                │                                 │
       │  5. Login Page                 │                                 │
       │<─────────────────────────────────────────────────────────────────┤
       │                                │                                 │
       │  6. Submit credentials         │                                 │
       ├─────────────────────────────────────────────────────────────────>│
       │                                │                                 │
       │                                │     7. Validate & Create        │
       │                                │        Signed Assertion         │
       │                                │                                 │
       │  8. POST /saml/callback with SAMLResponse                       │
       │<─────────────────────────────────────────────────────────────────┤
       │                                │                                 │
       │  9. POST SAMLResponse          │                                 │
       ├───────────────────────────────>│                                 │
       │                                │                                 │
       │                                │  10. Validate signature         │
       │                                │      Extract attributes         │
       │                                │      Create session             │
       │                                │                                 │
       │  11. Redirect to dashboard     │                                 │
       │<───────────────────────────────┤                                 │
       │                                │                                 │
```

</details>

<details>
<summary>Detailed steps, security properties, and bindings</summary>

**Steps**

1. User clicks "Sign In with SAML".
2. SP creates an `AuthnRequest`, deflates + Base64-encodes it.
3. Browser is redirected to Curity with `SAMLRequest`.
4. Curity authenticates the user.
5. Curity signs an Assertion containing user attributes.
6. Browser POSTs the `SAMLResponse` to the SP callback URL.
7. SP validates the signature, extracts attributes, creates an HTTP session.
8. User sees the dashboard with session info and captured messages.

**Security elements**

- **Digital signatures** — Curity signs assertions with its private key; SP validates with the published cert.
- **Timestamps** (`NotBefore` / `NotOnOrAfter`) prevent replay attacks.
- **Audience restriction** scopes the assertion to this SP.
- **Subject confirmation** validates the assertion recipient.

**Bindings**

- HTTP-Redirect for `AuthnRequest` (deflated + Base64 in the URL).
- HTTP-POST for `SAMLResponse` (form POST with Base64 body).

</details>

### Unsolicited (IdP-Initiated) flow

Almost entirely **server-to-server** — once the user clicks the button, SAML Inspector talks to Curity directly across multiple hops. The browser only sees the initial click and the final result.

<details>
<summary>Sequence diagram</summary>

```
┌─────────────┐                  ┌──────────────┐                  ┌─────────────┐
│   Browser   │                  │SAML Inspector│                  │   Curity    │
│             │                  │(acts as IdP) │                  │  (host SP)  │
└──────┬──────┘                  └──────┬───────┘                  └──────┬──────┘
       │                                │                                 │
       │  1. Click "Send Unsolicited    │                                 │
       │      Response"                 │                                 │
       ├───────────────────────────────>│                                 │
       │                                │                                 │
       │                                │  2. Build <samlp:Response>      │
       │                                │     Sign Assertion (RSA-SHA256) │
       │                                │     Sign Response (covers the   │
       │                                │       already-signed Assertion) │
       │                                │                                 │
       │                                │  3. POST SAMLResponse +         │
       │                                │     bootstrap form-body params  │
       │                                │     (serviceProviderId,         │
       │                                │      client_id) → saml2-sp ACS  │
       │                                ├────────────────────────────────>│
       │                                │                                 │
       │                                │           4. Verify signature,  │
       │                                │              parse Audience,    │
       │                                │              create SSO session │
       │                                │              (Set-Cookie)       │
       │                                │                                 │
       │                                │  5. HTML auto-submit form       │
       │                                │     (POST + CSRF token →        │
       │                                │      /dev/oauth/authorize)      │
       │                                │<────────────────────────────────┤
       │                                │                                 │
       │                                │  6. Follow the auto-submit form │
       │                                │     POST (with session cookies  │
       │                                │      + CSRF token)              │
       │                                ├────────────────────────────────>│
       │                                │                                 │
       │                                │  7. 303 Redirect to             │
       │                                │     redirect_uri?code=...       │
       │                                │<────────────────────────────────┤
       │                                │                                 │
       │                                │  8. Capture authorization code  │
       │                                │                                 │
       │                                │  9. POST /dev/oauth/token       │
       │                                │     (code + Basic auth with     │
       │                                │      client_id:client_secret)   │
       │                                ├────────────────────────────────>│
       │                                │                                 │
       │                                │  10. access_token + id_token    │
       │                                │      + refresh_token (JSON)     │
       │                                │<────────────────────────────────┤
       │                                │                                 │
       │  11. JSON result               │                                 │
       │      (tokens, decoded id_token │                                 │
       │       claims, HTTP trace,      │                                 │
       │       sent XML)                │                                 │
       │<───────────────────────────────┤                                 │
       │                                │                                 │
```

</details>

<details>
<summary>Wire-format gotchas worth knowing</summary>

- **Sign assertion first, then response.** The response signature must cover the canonicalized form of the *already-signed* assertion. Reversing the order produces a digest mismatch on Curity.
- **Bootstrap params live in the form body, not the query string.** Curity's `AuthenticationController` gates dispatch on `serviceProviderId` / `client_id` in the body. URL-only fails with `400 missing_parameters`.
- **The auto-submit form Curity returns is `POST` with a hidden CSRF token**, not a 302 redirect. SAML Inspector's `followAutoSubmitForm` branches on method and replays the hidden inputs.
- **Cookies traverse hops in-process.** Session cookies from Curity's saml2-sp response are kept in a `CookieJar` and replayed on every subsequent hop — `/dev/oauth/authorize` can't find the SSO session without them.
- **The registered `redirect_uri` is never visited by the browser** in the normal flow. SAML Inspector intercepts the 303 server-side and reads `?code=…` from the `Location` header directly. The route exists so the OAuth client's `redirect_uri` is legitimate.

</details>

<details>
<summary>What the backend does on POST /api/unsolicited/send</summary>

1. Builds an unsigned `<samlp:Response>` with `<saml:Issuer>`, `<samlp:Status>`, and a `<saml:Assertion>` containing `<Subject>`, `<SubjectConfirmation>`, `<Conditions>` (with `<AudienceRestriction>`) and `<AuthnStatement>`. No `InResponseTo` — that's what makes it unsolicited.
2. Signs the assertion (RSA-SHA256, exclusive C14N, enveloped), then signs the response. Both signatures are repositioned immediately after `<saml:Issuer>` (SAML 2.0 schema requirement).
3. POSTs `application/x-www-form-urlencoded` to the saml2-sp ACS URL with `SAMLResponse`, `serviceProviderId`, `resumePath`, `client_id`, `redirect_uri`, `response_type=code`, `scope`.
4. Follows the auto-submit HTML form Curity returns (POST to `/dev/oauth/authorize` with cookies), reads the `code` from the 303 `Location` header server-side.
5. Exchanges the code at `/dev/oauth/token` with HTTP Basic auth.
6. Returns the tokens, decoded `id_token` claims and an HTTP trace to the UI.

</details>

#### UI form fields

- **Subject NameID** — assertion subject (e.g. `johndoe`).
- **Audience** — `<saml:Audience>` value.
- **OAuth Client ID / Client Secret / Redirect URI / Scope** — used for the OAuth code exchange. Defaults pre-filled.
- **Sign assertion / Sign response** — toggles to A/B test which Curity-side validators fire.

## Curity-side setup

SAML Inspector talks to a Curity Identity Server in two distinct roles, one per flow, and each needs its own piece of Curity-side config:

| Flow | What you register on Curity |
|---|---|
| **SP-Initiated** | A SAML 2 *service-provider* on the `saml-idp` profile — Curity acts as the IdP, this app is the SP. |
| **Unsolicited** | A `saml2-sp` *authenticator* that trusts the IdP signing cert, plus an OAuth *client* with our redirect URI. |

For background, see [Curity's SAML IdP profile docs](https://curity.io/docs/identity-server/profiles/saml-idp-profile/).

### One-time Unsolicited setup

On first boot the server writes a fresh 2048-bit RSA keypair + self-signed X.509 cert to `server/keys/idp-signing.{key,crt}.pem`. Two manual changes are then needed on the host Curity:

1. **Trust the cert.** Admin UI → Facilities → Signature Verification Keys → Add. Paste the cert PEM (available via `GET /api/unsolicited/cert` or the **"Copy PEM"** button in the Unsolicited tab's "One-Time Setup" section). Reference the new key from the `saml2-sp` authenticator (primary or secondary signature-verification key).
2. **Register the callback URL.** Admin UI → Token Service → Clients → `saml2_unsolicited_client` → Redirect URIs → Add `http://localhost:3001/api/unsolicited/callback` (or whatever `UNSOLICITED_REDIRECT_URI` is set to).

Commit both changes. From that point on, just hit **Send Unsolicited Response** in the UI.

### Reference XML

<details>
<summary>SAML SP config (for SP-Initiated flow)</summary>

Minimal `service-provider` definition.

```xml
<config xmlns="http://tail-f.com/ns/config/1.0">
  <profiles xmlns="https://curity.se/ns/conf/base">
    <profile>
      <id>saml-idp</id>
      <type xmlns:si="https://curity.se/ns/conf/profile/saml-idp">si:saml-idp-service</type>
      <settings>
        <saml-idp-service xmlns="https://curity.se/ns/conf/profile/saml-idp">
          <service-providers>
            <service-provider>
              <id>http://localhost:3001/saml/metadata</id>
              <assertion>
                <audience>http://localhost:3001/saml/metadata</audience>
              </assertion>
              <request-bindings>
                <redirect/>
                <post/>
              </request-bindings>
              <assertion-consumer-service>
                <index>1</index>
                <url>http://localhost:3001/saml/callback</url>
                <protocol-binding>urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST</protocol-binding>
              </assertion-consumer-service>
              <user-authentication>
                <allowed-authenticators>username</allowed-authenticators>
                <force-authn>true</force-authn>
              </user-authentication>
            </service-provider>
          </service-providers>
        </saml-idp-service>
      </settings>
    </profile>
  </profiles>
</config>
```

Key field mappings:

- `<service-provider><id>` and `<assertion><audience>` must both equal `SAML_SP_ISSUER` (default `http://localhost:3001/saml/metadata`).
- `<assertion-consumer-service><url>` must equal `SAML_SP_CALLBACK_URL` (default `http://localhost:3001/saml/callback`).
- `<allowed-authenticators>` names the Curity authenticator(s) end users will sign in with — `username` is the default; swap in whatever you have configured.
- `<force-authn>true</force-authn>` makes Curity always show the login screen — convenient for testing different users; remove if you want SSO behavior.

</details>

<details>
<summary>OAuth client config (for Unsolicited flow)</summary>

Minimal `saml2_unsolicited_client` definition.

```xml
<config xmlns="http://tail-f.com/ns/config/1.0">
  <profiles xmlns="https://curity.se/ns/conf/base">
    <profile>
      <id>oauth-dev</id>
      <type xmlns:as="https://curity.se/ns/conf/profile/oauth">as:oauth-service</type>
      <settings>
        <authorization-server xmlns="https://curity.se/ns/conf/profile/oauth">
          <client-store>
            <config-backed>
              <client>
                <id>saml2_unsolicited_client</id>
                <secret>$5$yonw8ftgqJ....</secret>
                <redirect-uris>http://localhost:3001/api/unsolicited/callback</redirect-uris>
                <scope>openid</scope>
                <user-authentication>
                  <allowed-authenticators>saml2-sp</allowed-authenticators>
                </user-authentication>
                <capabilities>
                  <code>
                  </code>
                </capabilities>
                <validate-port-on-loopback-interfaces>true</validate-port-on-loopback-interfaces>
              </client>
            </config-backed>
          </client-store>
        </authorization-server>
      </settings>
    </profile>
  </profiles>
</config>
```

Key field mappings:

- `<id>` must equal `UNSOLICITED_CLIENT_ID` (default `saml2_unsolicited_client`).
- `<redirect-uris>` must include `UNSOLICITED_REDIRECT_URI` (default `http://localhost:3001/api/unsolicited/callback`).
- `<allowed-authenticators>` must be `saml2-sp` — the authenticator the unsolicited Response is POSTed at.
- `<capabilities><code/></capabilities>` enables the authorization-code grant the app exchanges for tokens.

</details>

## Configuration reference

All configuration is in `.env`. See `.env.example` for the full template with comments; the table below is a quick reference.

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default `3001`) |
| `SAML_SP_ISSUER` | SP entity ID (default `http://localhost:3001/saml/metadata`) |
| `SAML_SP_CALLBACK_URL` | SAML assertion consumer service URL |
| `SAML_IDP_METADATA_URL` | Auto-configure entry point + cert from this metadata URL (recommended) |
| `SAML_IDP_ENTRY_POINT` / `SAML_IDP_CERT` | Manual IdP fallback if no metadata URL |
| `SAML_IDP_LOGOUT_REDIRECT_URL` | Curity SLO endpoint with `?redirect_uri=` back to SP |
| `SAML_IDP_SKIP_CERT_VALIDATION` | Skip cert validation (dev only) |
| `UNSOLICITED_ACS_URL` | `saml2-sp` ACS endpoint to POST the unsolicited Response at |
| `UNSOLICITED_AUDIENCE` | Default `<saml:Audience>` (used to demo the audience-validation gap) |
| `UNSOLICITED_IDP_ENTITY_ID` | `<saml:Issuer>` value the host SP must trust |
| `UNSOLICITED_OAUTH_PROFILE_ID` / `UNSOLICITED_RESUME_PATH` | Bootstrap params Curity expects in the form body |
| `UNSOLICITED_CLIENT_ID` / `UNSOLICITED_CLIENT_SECRET` / `UNSOLICITED_REDIRECT_URI` / `UNSOLICITED_SCOPE` | OAuth client + scope for the code exchange |
| `UNSOLICITED_TOKEN_URL` | Override the token endpoint if not derivable from ACS host |
| `UNSOLICITED_KEY_PATH` / `UNSOLICITED_CERT_PATH` | Point at a non-generated keypair (e.g. to A/B against the Python tester) |

## Development

### Testing

Vitest + supertest, co-located beside source as `*.test.ts`.

```bash
npm test                # one-shot, CI-friendly
npm run test:watch      # re-run on save
npm run test:coverage   # v8 coverage report
```

Coverage is concentrated on the SAML wire-format pieces — they have silent failure modes manual UI testing won't catch:

| Area | Coverage | Guards |
|---|---|---|
| `unsolicited/sign.ts` | 96% | `<ds:Signature>` placement (immediately after `<saml:Issuer>`) and the sign-assertion-then-response invariant |
| `saml/metadata.ts` | 96% | IdP/SP parsing with `md:`-prefixed and default-namespace XML |
| `unsolicited/buildResponse.ts` | 92% | Response shape, escaping, unique IDs, default time offsets |
| `saml/decode.ts` | 89% | Base64 + deflate, base64-only, malformed input |
| `config/samlConfig.ts` | 100% | Env permutations → strategy config + `isSamlConfigured` |
| `unsolicited/http/cookieJar.ts` | 100% | Cookie absorb/replay across hops |
| `routes/diagnostic.ts` | 86% | HTTP routing (supertest against a booted Express app) |

Not covered: full unsolicited end-to-end (requires a live Curity), the network HTTP wrapper, and client components. These remain manual smoke tests.

### Tech stack

- **Language:** TypeScript throughout (strict mode). Server: `tsx` in dev, compiled JS in prod. Client: Vite-bundled.
- **Backend:** Node.js + Express + Passport (`@node-saml/passport-saml`), session/cookie middleware, `xml2js`, `xml-crypto`, `node-forge`, `@xmldom/xmldom`.
- **Frontend:** React 18, Tailwind 4, Radix UI, lucide-react, Axios.
- **Tests:** Vitest + supertest, co-located beside source.

<details>
<summary>Project structure</summary>

```
saml-inspector/
├── server/
│   ├── index.ts                  # Bootstrap entry (env → config → strategy → listen)
│   ├── app.ts                    # createApp(): Express wiring (no listen)
│   ├── state.ts                  # Mutable SAML config state holder
│   ├── config/                   # env.ts, samlConfig.ts, bootstrap.ts
│   ├── saml/                     # strategy.ts, metadata.ts, decode.ts, messageStore.ts
│   ├── routes/                   # diagnostic.ts, samlAuth.ts, unsolicited.ts
│   ├── lib/httpClient.ts         # Shared insecure http/https helpers
│   ├── unsolicited/              # Unsolicited SAML Response test backend
│   │   ├── keys.ts               # First-boot RSA + self-signed X.509 generation
│   │   ├── buildResponse.ts      # Builds unsigned SAML 2.0 Response XML
│   │   ├── sign.ts               # signAssertion / signResponse with xml-crypto
│   │   ├── handler.ts            # Orchestrates the 3-step flow
│   │   ├── oauthChain.ts         # POST → form follow → token exchange (cookie-aware)
│   │   ├── http/                 # cookieJar.ts + request.ts (fetch wrapper)
│   │   └── types.ts              # UnsolicitedInput, UnsolicitedResult union
│   ├── types/domain.ts           # Cross-module types
│   └── keys/                     # Generated IdP signing keypair (gitignored)
├── client/
│   ├── src/
│   │   ├── App.tsx, main.tsx, index.css
│   │   ├── components/
│   │   │   ├── tabs/                           # OverviewTab, SpInitiatedTab, UnsolicitedTab, InspectorTab
│   │   │   ├── Header.tsx, StatusStrip.tsx, TabBar.tsx, AlertBanner.tsx
│   │   │   ├── Dashboard.tsx                   # SP-Initiated auth status + Sign In/Out
│   │   │   ├── SessionInfo.tsx                 # User attributes + session index
│   │   │   ├── ConfigPanel.tsx                 # SAML strategy editor (SP-Initiated tab)
│   │   │   ├── MessageViewer.tsx               # Captured messages with source badges
│   │   │   ├── SetupChecklist.tsx              # Per-flow prerequisite grouping (Overview)
│   │   │   ├── HostCuritySetup.tsx             # Cert + redirect-URI host-Curity instructions
│   │   │   ├── ParametersForm.tsx              # Unsolicited input fields + submit
│   │   │   ├── UnsolicitedResult.tsx           # Stepper + outcome + trace + tokens
│   │   │   ├── FlowStepper.tsx                 # Horizontal step indicator
│   │   │   ├── CollapsibleSection.tsx, CopyButton.tsx
│   │   │   └── ui/                             # shadcn primitives
│   │   ├── api/                                # Typed axios layer (one file per endpoint)
│   │   ├── hooks/                              # useDiagnosticData, useIdpStatus, useTab, useLocalStorage
│   │   ├── types/api.ts                        # Client mirror of server payload types
│   │   └── lib/utils.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── extract-cert.ts           # Certificate extraction utility
├── tsconfig.json                 # Server typecheck config (rootDir: ".")
├── tsconfig.build.json           # Server production build (rootDir: "./server")
├── vitest.config.ts
├── .env.example
├── .gitignore
├── package.json
├── CLAUDE.md                     # Engineer/AI handoff notes — gotchas live here
└── README.md
```

</details>

## API reference

<details>
<summary>All HTTP endpoints</summary>

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check + configuration status |
| `/api/session` | GET | Current session information |
| `/api/config` | GET / POST | Read or update SAML configuration |
| `/api/idp-status` | GET | Check IdP endpoint reachability |
| `/api/messages` | GET / DELETE | Captured SAML messages / clear |
| `/api/decode` | POST | Decode a SAML message |
| `/api/parse-metadata` | POST | Parse SAML metadata XML |
| `/saml/metadata` | GET | SP metadata XML |
| `/saml/login` | GET | Initiate SAML authentication |
| `/saml/callback` | POST | SAML assertion consumer service |
| `/saml/logout` | GET | Logout and redirect to IdP logout |
| `/saml/logout/callback` | GET | Callback after IdP logout completes |
| `/api/unsolicited/send` | POST | Build + sign + POST unsolicited SAML Response and drive OAuth chain |
| `/api/unsolicited/defaults` | GET | Defaults the Unsolicited tab pre-fills the form with |
| `/api/unsolicited/cert` | GET | IdP signing cert PEM (for one-time host SP registration) |
| `/api/unsolicited/callback` | GET | Registered OAuth `redirect_uri` target (code is captured server-side) |

</details>

## Resources

- [Curity Identity Server — SAML IdP profile](https://curity.io/docs/identity-server/profiles/saml-idp-profile/)
- [SAML 2.0 Technical Overview](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Passport-SAML](https://github.com/node-saml/passport-saml)
