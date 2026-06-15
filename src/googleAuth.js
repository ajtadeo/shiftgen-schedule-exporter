/**
 * @file googleAuth.js
 * @brief Utility functions for Google API authentication.
 */

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CLIENT_ID = '1000397082507-quhbbs8d25vjs5k57cpc5cuuvst84s5n.apps.googleusercontent.com'; // web app
const CLIENT_SECRET = "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"; // web app
const REDIRECT_URI = browser.identity.getRedirectURL();
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar"
];

export async function getAccessToken() {
  // Check if token already exists
  const localStorage = await browser.storage.local.get('google_auth');
  const auth = localStorage["google_auth"];
  if (auth) {
    if (Date.now() < auth.expiresAt) {
      return auth.accessToken;
    }
    // If expired but we have a refresh token, refresh it
    if (auth.refreshToken) {
      try {
        return await refreshAccessToken(auth.refreshToken);
      } catch (e) {
        console.error('Token refresh failed, re-authenticating:', e);
      }
    }
  }

  // Fallback for no stored token or refresh failed
  implicitAuthFlow();
}

async function implicitAuthFlow() {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(GOOGLE_OAUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const redirectUrl = await browser.identity.launchWebAuthFlow({
    url: authUrl.href,
    interactive: true
  });

  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) throw new Error("Authorization failed: Code not found.");
  return exchangeCodeForToken(code, codeVerifier);
}

async function exchangeCodeForToken(code, codeVerifier) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code: code,
      code_verifier: codeVerifier
    })
  });

  const data = await response.json();
  if (!data.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(data));

  await storeTokens(data);
  return data.access_token;
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const data = await response.json();
  if (!data.access_token) throw new Error('Refresh failed: ' + JSON.stringify(data));

  await storeTokens({ ...data, refresh_token: refreshToken }); // refresh response omits refresh_token
  return data.access_token;
}

async function storeTokens(tokenData) {
  await browser.storage.local.set({
    ['google_auth']: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000) - 60000 // 1 min buffer
    }
  });
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}