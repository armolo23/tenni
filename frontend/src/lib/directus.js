/**
 * Directus SDK Client Configuration
 *
 * This module initializes the Directus SDK with:
 * - Cookie-based authentication (HttpOnly refresh tokens)
 * - Automatic token refresh
 * - REST API composable
 *
 * @see https://docs.directus.io/guides/sdk/getting-started.html
 */

import { createDirectus, authentication, rest } from '@directus/sdk';

/**
 * Directus API URL from environment variables
 * Default: http://localhost:8055
 */
const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055';

/**
 * Directus SDK Client Instance
 *
 * Features:
 * - Cookie-based auth (secure, HttpOnly tokens)
 * - Auto-refresh (7-day refresh token, 15-min access token)
 * - REST API endpoints
 *
 * Usage:
 * ```javascript
 * import { client } from '@/lib/directus';
 *
 * // Read items
 * const bookings = await client.request(readItems('bookings'));
 *
 * // Login
 * await client.login('user@example.com', 'password');
 *
 * // Get current user
 * const user = await client.request(readMe());
 * ```
 */
const client = createDirectus(DIRECTUS_URL)
  .with(rest())
  .with(authentication('cookie', {
    autoRefresh: true,
    credentials: 'include' // Required for CORS cookie handling
  }));

/**
 * Export client as default and named export
 */
export { client };
export default client;
