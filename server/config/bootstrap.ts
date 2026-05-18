import * as env from './env';
import { fetchMetadata, parseMetadata } from '../saml/metadata';
import { ensureKeysExist } from '../unsolicited/keys';

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
      console.log('🔑 Generated unsolicited-SAML signing keypair:');
      console.log(`   key:  ${info.keyPath}`);
      console.log(`   cert: ${info.certPath}`);
      console.log(
        '   Register the cert on the host Curity SP (saml2-sp authenticator) before running the unsolicited flow.'
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ Failed to ensure unsolicited signing keys:', message);
  }
}
