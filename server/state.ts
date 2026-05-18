import type { SamlStrategyConfig } from './types/domain';

/**
 * Mutable application state populated during bootstrap and read by routes.
 *
 * Request handlers are registered at module-load time but execute later,
 * so they need a stable place to read SAML config after the async bootstrap
 * finishes. Keeping this in one tiny module is clearer than threading it
 * through factory functions.
 */
interface AppState {
  samlConfig: SamlStrategyConfig | null;
  isSamlConfigured: boolean;
}

const state: AppState = {
  samlConfig: null,
  isSamlConfigured: false
};

export function setSamlConfig(config: SamlStrategyConfig, configured: boolean): void {
  state.samlConfig = config;
  state.isSamlConfigured = configured;
}

export function getSamlConfig(): SamlStrategyConfig | null {
  return state.samlConfig;
}

export function isSamlConfigured(): boolean {
  return state.isSamlConfigured;
}
