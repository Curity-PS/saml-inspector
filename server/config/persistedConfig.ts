import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Tiny on-disk overlay for runtime-toggleable config that must survive
 * server restarts. Without this, settings like signAuthnRequests reset to
 * the env default whenever nodemon auto-restarts in dev — silently
 * desyncing the React UI's toggle from the live server state.
 *
 * Layered precedence: persisted file > env var > built-in default.
 * Only fields a user can flip from the UI belong here. SAML_IDP_ENTRY_POINT
 * and friends stay in .env where they belong with the rest of the secrets.
 */

export interface PersistedConfig {
  signAuthnRequests?: boolean;
}

// Sits at the project root next to .env. Path is intentionally fixed
// (not env-overridable) — this is local dev-tool state, not a deployment
// concern.
const FILE = path.resolve(__dirname, '..', '..', '.runtime-config.json');

export function read(): PersistedConfig {
  try {
    if (!fs.existsSync(FILE)) return {};
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as PersistedConfig;
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`⚠️  Failed to read ${path.basename(FILE)}: ${message}. Using defaults.`);
    return {};
  }
}

export function write(next: PersistedConfig): void {
  const current = read();
  const merged = { ...current, ...next };
  try {
    fs.writeFileSync(FILE, JSON.stringify(merged, null, 2) + '\n', { mode: 0o600 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`⚠️  Failed to persist ${path.basename(FILE)}: ${message}`);
  }
}
