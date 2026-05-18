import 'dotenv/config';

import * as env from './config/env';
import { createApp } from './app';
import { loadIdpMetadata, ensureUnsolicitedKeys } from './config/bootstrap';
import { buildSamlConfig } from './config/samlConfig';
import { registerSamlStrategy } from './saml/strategy';
import * as state from './state';

async function main(): Promise<void> {
  await loadIdpMetadata();
  ensureUnsolicitedKeys();

  const configState = buildSamlConfig();
  state.setSamlConfig(configState.samlConfig, configState.isSamlConfigured);
  registerSamlStrategy(configState);

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`\n🚀 SAML Inspector server running on http://localhost:${env.PORT}`);
    console.log(`📱 Make sure your React app is running on http://localhost:3000`);
    console.log(
      `📄 SP SAML Metadata available at: http://localhost:${env.PORT}/saml/metadata\n`
    );
  });
}

main().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
