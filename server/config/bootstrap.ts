import * as env from './env';
import { fetchMetadata, parseMetadata } from '../saml/metadata';
import { ensureKeysExist } from '../unsolicited/keys';
import { ensureSpKeysExist } from '../saml/spKeys';

/**
 * If SAML_IDP_METADATA_URL is set, fetch + parse it and mutate process.env
 * with the discovered entryPoint/cert. Falls back to whatever the user
 * configured manually in .env on any error.
 */
export async function loadIdpMetadata(): Promise<void> {
  const url = env.SAML_IDP_METADATA_URL;
  if (!url) return;

  try {
    console.log(`📥 Fetching IDP metadata from: ${url}`);
    const xml = await fetchMetadata(url);
    const config = await parseMetadata(xml, 'idp');
    console.log('✅ Successfully loaded configuration from IDP metadata');

    if (config.entryPoint) process.env.SAML_IDP_ENTRY_POINT = config.entryPoint;
    if (config.cert) process.env.SAML_IDP_CERT = config.cert;

    console.log(`   Entry Point: ${config.entryPoint}`);
    console.log(`   Certificate: ${config.cert ? 'Loaded from metadata' : 'Not found'}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('⚠️  Failed to fetch/parse IDP metadata:', message);
    console.warn('   Falling back to manual configuration from .env');
  }
}

/**
 * Generate the unsolicited-SAML signing keypair on first boot.
 * No-op on subsequent boots.
 */
export function ensureUnsolicitedKeys(): void {
  try {
    const info = ensureKeysExist();
    if (info.generated) {
      console.log('🔑 Generated unsolicited-SAML (IdP role) signing keypair:');
      console.log(`   key:  ${info.keyPath}`);
      console.log(`   cert: ${info.certPath}`);
      console.log(
        '   Used to sign unsolicited <samlp:Response> on the IdP side.'
      );
      console.log(
        '   Register the cert on the host Curity SP (saml2-sp authenticator) before running the unsolicited flow.'
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ Failed to ensure unsolicited signing keys:', message);
  }
}

/**
 * Generate the SP-Initiated signing keypair on first boot. Used by
 * passport-saml to sign outbound <samlp:AuthnRequest> when the user enables
 * "Sign AuthnRequest" in the UI. Distinct from ensureUnsolicitedKeys —
 * different role (SP vs IdP) and different trust relationship on Curity.
 */
export function ensureSpKeys(): void {
  try {
    const info = ensureSpKeysExist();
    if (info.generated) {
      console.log('🔑 Generated SP-Initiated signing keypair:');
      console.log(`   key:  ${info.keyPath}`);
      console.log(`   cert: ${info.certPath}`);
      console.log(
        '   Used to sign <samlp:AuthnRequest> sent to Curity in the SP-Initiated flow.'
      );
      console.log(
        '   Register the cert on the host Curity IdP (SAML2 SP entry) to enable signature validation.'
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ Failed to ensure SP signing keys:', message);
  }
}
