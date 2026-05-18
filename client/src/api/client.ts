import axios from 'axios';

/**
 * Shared axios instance. Vite proxies /api and /saml to :3001 in dev, so we
 * don't need a baseURL — relative paths work in both dev and prod.
 *
 * `withCredentials: true` is required for the session-cookie-bearing routes
 * (notably /api/session). Other routes don't care but it's harmless.
 */
export const apiClient = axios.create({
  withCredentials: true
});
