/**
 * Keycloak OIDC Client Configuration
 * RFC-0011: Keycloak認証統合
 */

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export const keycloakConfig: KeycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost/keycloak',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'scheduling-tool',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'scheduling-frontend',
};

/**
 * Generate Keycloak URLs
 */
export function getKeycloakUrls(config: KeycloakConfig) {
  const realmUrl = `${config.url}/realms/${config.realm}`;

  return {
    authorization: `${realmUrl}/protocol/openid-connect/auth`,
    token: `${realmUrl}/protocol/openid-connect/token`,
    logout: `${realmUrl}/protocol/openid-connect/logout`,
    userinfo: `${realmUrl}/protocol/openid-connect/userinfo`,
    jwks: `${realmUrl}/protocol/openid-connect/certs`,
  };
}

/**
 * PKCE Helper: Generate random code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * PKCE Helper: Base64 URL encode
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * PKCE Helper: Generate code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Build authorization URL for login redirect (with PKCE)
 */
export async function buildAuthUrl(
  config: KeycloakConfig,
  redirectUri: string,
  state?: string,
  nonce?: string
): Promise<{ url: string; codeVerifier: string }> {
  const urls = getKeycloakUrls(config);

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    kc_idp_hint: 'google', // Automatically redirect to Google IdP
    ...(state && { state }),
    ...(nonce && { nonce }),
  });

  return {
    url: `${urls.authorization}?${params.toString()}`,
    codeVerifier,
  };
}

/**
 * Build logout URL
 */
export function buildLogoutUrl(
  config: KeycloakConfig,
  redirectUri: string,
  idToken?: string
): string {
  const urls = getKeycloakUrls(config);
  const params = new URLSearchParams({
    post_logout_redirect_uri: redirectUri,
    ...(idToken && { id_token_hint: idToken }),
  });

  return `${urls.logout}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens (with PKCE)
 */
export async function exchangeCodeForTokens(
  config: KeycloakConfig,
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}> {
  const urls = getKeycloakUrls(config);

  const response = await fetch(urls.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  config: KeycloakConfig,
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const urls = getKeycloakUrls(config);

  const response = await fetch(urls.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

