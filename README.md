# SAML Inspector

SAML Inspector is a diagnostic web application for testing and debugging SAML 2.0 authentication flows with Curity Identity Server acting as a SAML Identity Provider (IDP).

## Features

- **SAML Service Provider (SP)** implementation using Passport.js with @node-saml/passport-saml
- **Auto-configuration from metadata** - automatically fetch and configure IDP settings from metadata URL
- **Real-time SAML message visualization** - decode and inspect SAML requests/responses with syntax-highlighted XML
- **Configurable IDP settings** - update configuration via .env or UI with metadata import
- **Message decoder** - manually decode Base64-encoded SAML messages
- **Unsolicited SAML Response tester** - hand-crafts, signs and POSTs an unsolicited SAML 2.0 Response at a Curity SAML2 authenticator and drives the OAuth code exchange end-to-end. Single-click button renders the access / id / refresh tokens, decoded id_token claims, HTTP trace and the sent XML. Includes form fields to flip the audience, NameID, OAuth client, scope, and sign-assertion / sign-response toggles. See [Unsolicited SAML Response test](#unsolicited-saml-response-test) below.

## Prerequisites

- Node.js (v18 or higher)
- npm
- Curity Identity Server configured as a SAML IDP
- Basic understanding of SAML 2.0 protocol

## Quick Start

### 1. Install Dependencies

Install root dependencies:
```bash
npm install
```

Install client dependencies:
```bash
cd client
npm install
cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

**Option 1: Auto-configure from IDP metadata URL (Recommended):**

Simply provide the IDP metadata URL and the application will automatically fetch the entry point and certificate at startup:

```env
# SP Server Configuration
PORT=3001
SESSION_SECRET=random-secret

# SAML Service Provider (SP) Configuration
SAML_SP_ISSUER=http://localhost:3001/saml/metadata
SAML_SP_CALLBACK_URL=http://localhost:3001/saml/callback

# SAML Identity Provider (IDP) Configuration - Curity Server
SAML_IDP_METADATA_URL=https://localhost:8443/saml/sso/metadata

# IDP Logout URL - Curity Identity Server logout endpoint with redirect back to SP
SAML_IDP_LOGOUT_REDIRECT_URL=https://localhost:8443/dev/authn/authenticate/logout?redirect_uri=http://localhost:3001/saml/logout/callback

# Certificate Validation
SAML_IDP_SKIP_CERT_VALIDATION=false
```

**Option 2: Manual configuration (without metadata URL):**

If you prefer to configure manually or metadata is not available:

```env
# SP Server Configuration
PORT=3001
SESSION_SECRET=your-random-session-secret-here-change-this

# SAML Service Provider (SP) Configuration
SAML_SP_ISSUER=http://localhost:3001/saml/metadata
SAML_SP_CALLBACK_URL=http://localhost:3001/saml/callback

# SAML Identity Provider (IDP) Configuration - Manual
SAML_IDP_ENTRY_POINT=https://localhost:8443/saml/sso

# IDP Certificate (from Curity metadata KeyDescriptor)
# Copy certificate content without BEGIN/END markers and line breaks
SAML_IDP_CERT=MIID...your-certificate-here...

# IDP Logout URL - Curity Identity Server logout endpoint with redirect back to SP
SAML_IDP_LOGOUT_REDIRECT_URL=https://localhost:8443/dev/authn/authenticate/logout?redirect_uri=http://localhost:3001/saml/logout/callback

# Certificate Validation
SAML_IDP_SKIP_CERT_VALIDATION=false
```

### 3. Run the Application

Start both the backend server and React frontend:

```bash
npm run dev
```

Or run them separately:

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- SP Metadata: http://localhost:3001/saml/metadata

### 4. Other useful scripts

```bash
npm run typecheck      # tsc --noEmit on server + client
npm test               # Vitest one-shot (server unit + integration tests)
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Vitest with v8 coverage report
npm run build          # Produce server/dist (tsc) and client/dist (Vite)
npm start              # Run the compiled production server
```

## Curity Identity Server Configuration

Refer to [SAML IDP configuration](https://curity.io/docs/identity-server/profiles/saml-idp-profile/) for Curity SAML IDP setup.

## Usage

The app is organised into four tabs accessible via the top tab bar. Tab state is hash-routed (`#/overview` / `#/sp-initiated` / `#/unsolicited` / `#/inspector`) so refreshes and browser back/forward preserve the active tab.

- **Overview** — landing page. Two flow cards + a Setup Checklist split by flow ("SP-Initiated prerequisites" and "Unsolicited prerequisites"). The two user-confirmed Unsolicited items (cert registered, redirect URI registered) persist their checkbox state in `localStorage`.
- **SP-Initiated** — Sign In/Out, current session info, and the **SAML Configuration** editor (since it only governs this flow).
- **Unsolicited** — IdP-initiated SAML Response tester. Editable parameters, sign-assertion/sign-response toggles, then the result block with a step indicator, HTTP trace, tokens, and decoded id_token claims.
- **Inspector** — every captured SAML message with a flow filter (All / SP-Initiated / Unsolicited) and per-message source badges.

### Initiating SAML Login (SP-Initiated)

1. Open http://localhost:3000 — you land on the **Overview** tab
2. Click **"Open SP-Initiated"** (or pick the **SP-Initiated** tab directly)
3. Click **"Sign In with SAML"**
4. Complete the login at the Curity IDP
5. You land back on **SP-Initiated** with session info populated; the success banner offers **"View captured messages →"** to jump straight to the Inspector

### Running the Unsolicited Flow

1. Open the **Unsolicited** tab
2. Adjust parameters if needed (NameID, audience, OAuth client, sign-assertion / sign-response toggles)
3. Click **"Send Unsolicited Response"**
4. The result panel shows a step indicator, success/failure banner, HTTP trace, and tokens. Click **"Inspect XML →"** in the banner to jump to the Inspector for the captured Response XML.

### Viewing SAML Messages

The **Inspector** tab shows captured messages in four sub-tabs:
- **Requests** — SAML AuthnRequests sent to the IdP (all SP-Initiated)
- **Responses** — SAML Responses received (filter to see SP-Initiated vs. Unsolicited)
- **Assertions** — parsed user attributes + session index (all SP-Initiated)
- **Decoder** — paste a Base64-encoded SAML message to decode it on the fly

Each message header carries a flow badge (`SP-Initiated` / `Unsolicited`). Use the **Filter** above the sub-tabs to scope to one flow.

### Updating Configuration

The **SAML Configuration** panel lives on the SP-Initiated tab (it only governs that flow's passport-saml strategy options).

1. Open the **SP-Initiated** tab
2. Scroll to **SAML Configuration** and click **Edit**
3. Either **Import from Metadata** (paste IDP/SP metadata XML, fields auto-extract) or fill in **Manual Entry** (entry point, SP Entity ID, callback URL, IDP cert)
4. Click **Save Configuration**

## Testing

Vitest unit + integration tests live next to source as `*.test.ts`. Run with:

```bash
npm test                 # one-shot, CI-friendly
npm run test:watch       # re-run on save while editing
npm run test:coverage    # v8 coverage report
```

Coverage is deliberately concentrated on the SAML wire-format pieces — these have silent failure modes that manual UI testing won't catch quickly:

| Area | Coverage | What it guards |
|---|---|---|
| `unsolicited/sign.ts` | 96% | `<ds:Signature>` placement (immediately after `<saml:Issuer>`) and the nested sign-assertion-then-response invariant |
| `saml/metadata.ts` | 96% | IdP/SP parsing with both `md:`-prefixed and default-namespace XML |
| `unsolicited/buildResponse.ts` | 92% | Response XML shape, escaping, unique IDs, default time offsets |
| `saml/decode.ts` | 89% | base64 + deflate, base64-only, malformed input |
| `config/samlConfig.ts` | 100% | Env permutations → strategy config + `isSamlConfigured` flag |
| `unsolicited/http/cookieJar.ts` | 100% | Cookie absorb/header semantics across hops |
| `routes/diagnostic.ts` | 86% | HTTP routing (supertest against a booted Express app) |

What's *not* covered: the full unsolicited end-to-end chain (requires a live Curity), the network HTTP wrapper, and client components. These remain manual smoke tests.

## Tech Stack

- **Language:** TypeScript throughout (strict mode). Server runs via `tsx` in dev and compiled JS in production; client is bundled by Vite.
- **Backend:** Node.js + Express + Passport (@node-saml/passport-saml), session/cookie middleware, xml2js, xml-crypto, node-forge, @xmldom/xmldom.
- **Frontend:** React 18, Tailwind 4, Radix UI, lucide-react, Axios.
- **Tests:** Vitest + supertest, co-located beside source (`*.test.ts`).

## Project Structure

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
│   │   ├── oauthChain.ts         # POST → form follow → Fetch Tokens (cookie-aware)
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
├── CLAUDE.md                     # AI/engineer handoff notes — gotchas
└── README.md
```

## API Endpoints

### Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and configuration status |
| `/api/session` | GET | Current session information |
| `/api/config` | GET | Current SAML configuration |
| `/api/config` | POST | Update SAML configuration |
| `/api/idp-status` | GET | Check if IDP endpoint is reachable |
| `/api/messages` | GET | Get captured SAML messages |
| `/api/messages` | DELETE | Clear captured messages |
| `/api/decode` | POST | Decode a SAML message |
| `/api/parse-metadata` | POST | Parse SAML metadata XML |
| `/saml/metadata` | GET | SP metadata XML |
| `/saml/login` | GET | Initiate SAML authentication |
| `/saml/callback` | POST | SAML assertion consumer service |
| `/saml/logout` | GET | Logout and redirect to IDP logout |
| `/saml/logout/callback` | GET | Callback after IDP logout completes |
| `/api/unsolicited/send` | POST | Build + sign + POST unsolicited SAML Response and drive OAuth chain |
| `/api/unsolicited/defaults` | GET | Defaults the UnsolicitedPanel pre-fills the form with |
| `/api/unsolicited/cert` | GET | IdP signing cert PEM (for one-time host SP registration) |
| `/api/unsolicited/callback` | GET | Registered OAuth `redirect_uri` target (code is captured server-side) |


## 🔄 SAML Authentication Flow

### Overview

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

### Logout Flow

```
┌─────────────┐                  ┌──────────────┐                  ┌─────────────┐
│   Browser   │                  │ Diagnostic   │                  │   Curity    │
│             │                  │   Tool (SP)  │                  │    (IDP)    │
└──────┬──────┘                  └──────┬───────┘                  └──────┬──────┘
       │                                │                                 │
       │  1. Click Sign Out             │                                 │
       ├───────────────────────────────>│                                 │
       │                                │                                 │
       │                                │  2. Destroy local session       │
       │                                │                                 │
       │  3. Redirect to IDP logout     │                                 │
       │<───────────────────────────────┤                                 │
       │                                │                                 │
       │  4. GET /logout?redirect_uri=...                                 │
       ├─────────────────────────────────────────────────────────────────>│
       │                                │                                 │
       │                                │     5. Clear IDP session        │
       │                                │                                 │
       │  6. Redirect to /saml/logout/callback                           │
       │<─────────────────────────────────────────────────────────────────┤
       │                                │                                 │
       │  7. GET /saml/logout/callback  │                                 │
       ├───────────────────────────────>│                                 │
       │                                │                                 │
       │  8. Redirect to dashboard      │                                 │
       │<───────────────────────────────┤                                 │
       │                                │                                 │
```

### Detailed Login Steps

1. **User Initiates Login**: User clicks "Sign In with SAML" button
2. **Generate AuthnRequest**: SP creates a SAML authentication request, compresses (deflate), and Base64 encodes it
3. **Redirect to IDP**: Browser redirects to Curity with SAMLRequest parameter
4. **IDP Authentication**: Curity displays login page and validates user credentials
5. **Generate Assertion**: Curity creates a signed SAML assertion with user attributes
6. **POST Response**: Browser POSTs Base64-encoded SAMLResponse to SP callback URL
7. **Validate & Create Session**: SP validates signature, extracts attributes, and creates HTTP session
8. **Display Results**: User sees dashboard with session info and captured SAML messages

### Key Security Elements

- **Digital Signatures**: Curity signs assertions with private key, SP validates with public certificate
- **Timestamps**: `NotBefore` and `NotOnOrAfter` prevent replay attacks
- **Audience Restriction**: Ensures assertion is intended for this SP
- **Subject Confirmation**: Validates recipient and limits validity window

### SAML Bindings

- **HTTP-Redirect** (AuthnRequest): Request sent via browser redirect with deflated/Base64 encoded SAMLRequest
- **HTTP-POST** (Response): Response sent via form POST with Base64 encoded SAMLResponse

## Unsolicited SAML Response test

The app can additionally hand-craft, sign and POST an **unsolicited SAML 2.0 Response** at a Curity SAML2 authenticator (`saml2-sp`), then drive the OAuth code exchange all the way to tokens — entirely from the UI. This is a JS port of the standalone Python tool at `../saml-unsolicited-tester/` (kept around as a CLI reference; not invoked by this app).

### One-time setup on the host Curity

On first boot the server writes a fresh 2048-bit RSA keypair + self-signed X.509 certificate to `server/keys/idp-signing.{key,crt}.pem`. Two manual config changes are then needed on the host Curity (the SP being tested):

1. **Trust the cert.** Open the admin UI → Facilities → Signature Verification Keys → Add. Paste the cert PEM (also available via `GET /api/unsolicited/cert` or the "Copy PEM" button in the UnsolicitedPanel's "First-time setup" section). Reference the new key from the `saml2-sp` authenticator (primary or secondary signature-verification key).
2. **Add the callback URL.** Admin UI → Token Service → Clients → `saml2_unsolicited_client` → Redirect URIs → Add `http://localhost:3001/api/unsolicited/callback` (or whatever `UNSOLICITED_REDIRECT_URI` is set to).

Commit both changes. From that point on, just hit **Send Unsolicited Response** in the UI.

#### Reference OAuth client config (XML)

If you're configuring Curity via `curity-admin import` or want to inspect the exact client shape SAML Inspector expects, here's the minimal `saml2_unsolicited_client` definition. The `<secret>` is a SHA-256 crypt hash of the cleartext `saml2_unsolicited_client` (dev-only — replace if you're using this in any non-local setting).

<details>
<summary>Click to expand <code>saml2_unsolicited_client</code> XML</summary>

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

Key fields the diagnostic app depends on:
- `<id>` must equal `UNSOLICITED_CLIENT_ID` (default `saml2_unsolicited_client`).
- `<redirect-uris>` must include `UNSOLICITED_REDIRECT_URI` (default `http://localhost:3001/api/unsolicited/callback`).
- `<allowed-authenticators>` must be `saml2-sp` — the authenticator the unsolicited Response is POSTed at.
- `<capabilities><code/></capabilities>` enables the authorization-code grant the app exchanges in Step 3.

</details>

### How it works

The Express backend, on `POST /api/unsolicited/send`:

1. Builds an unsigned `<samlp:Response>` with `<saml:Issuer>`, `<samlp:Status>`, and a `<saml:Assertion>` containing `<Subject>`, `<SubjectConfirmation>`, `<Conditions>` (with `<AudienceRestriction>`) and `<AuthnStatement>`. No `InResponseTo` — that's what makes it unsolicited.
2. Signs the assertion (RSA-SHA256, exclusive C14N, enveloped) and then the response — assertion first so the response signature covers the canonicalised, already-signed assertion. Both signatures are repositioned to appear immediately after `<saml:Issuer>` (SAML 2.0 schema requirement).
3. POSTs `application/x-www-form-urlencoded` to the saml2-sp ACS URL with the bootstrap fields Curity's `AuthenticationController` needs to dispatch through the SAML transformer: `SAMLResponse`, `serviceProviderId`, `resumePath`, `client_id`, `redirect_uri`, `response_type=code`, `scope`.
4. Follows the auto-submit HTML form Curity returns (POST to `/dev/oauth/authorize` with cookies), reads the `code` from the 303 `Location` header server-side.
5. Exchanges the code at `/dev/oauth/token` with HTTP Basic auth.
6. Returns the tokens, decoded `id_token` claims and an HTTP trace to the UI.

### UI form fields

- **Subject NameID** — assertion subject (e.g. `johndoe`).
- **Audience** — `<saml:Audience>` value. Set to a deliberately wrong value to demonstrate the audience-validation gap in Curity's SAML2 authenticator (parsed but not validated).
- **OAuth client_id / client_secret / redirect_uri / scope** — used for the OAuth code exchange. Defaults are pre-filled.
- **Sign assertion / Sign response** — checkboxes to A/B test which Curity-side validators fire.

### Environment overrides

See `.env.example` for the full list of `UNSOLICITED_*` variables. Common ones:

- `UNSOLICITED_ACS_URL` — saml2-sp ACS endpoint.
- `UNSOLICITED_IDP_ENTITY_ID` — Issuer used in the Response/Assertion.
- `UNSOLICITED_CLIENT_ID` / `UNSOLICITED_CLIENT_SECRET` / `UNSOLICITED_REDIRECT_URI` / `UNSOLICITED_SCOPE`.
- `UNSOLICITED_KEY_PATH` / `UNSOLICITED_CERT_PATH` — point at a different keypair (e.g. the Python tester's `keys/test-idp-signing.{key,crt}.pem`) without re-registering anything on the host Curity.

### API endpoints

- `POST /api/unsolicited/send` — run the flow (form body in JSON).
- `GET /api/unsolicited/defaults` — defaults the UI pre-fills.
- `GET /api/unsolicited/cert` — the IdP signing cert PEM (for one-time registration).
- `GET /api/unsolicited/callback` — registered OAuth redirect target. Normally not reached by a browser; the server captures the code from the 303 directly.

## Additional Resources

- [Curity Identity Server SAML IDP Documentation](https://curity.io/docs/identity-server/profiles/saml-idp-profile/)
- [SAML 2.0 Specification](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Passport-SAML Documentation](https://github.com/node-saml/passport-saml)

