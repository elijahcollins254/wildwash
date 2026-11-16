import { createHmac, timingSafeEqual } from 'node:crypto';

const STATE_TTL_MS = 10 * 60 * 1000;

export type MobileGoogleState = {
  appState: string;
  appRedirectUri: string;
  expiresAt: number;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured on the Next.js server.`);
  }
  return value;
}

export function getMobileGoogleConfig() {
  const googleRedirectUri = requiredEnv('GOOGLE_MOBILE_REDIRECT_URI');
  const parsedRedirectUri = new URL(googleRedirectUri);
  if (
    (parsedRedirectUri.protocol !== 'https:' && parsedRedirectUri.hostname !== 'localhost') ||
    parsedRedirectUri.search ||
    parsedRedirectUri.hash
  ) {
    throw new Error('GOOGLE_MOBILE_REDIRECT_URI must be an HTTPS callback URL.');
  }

  const appRedirectUri = requiredEnv('EXPO_APP_REDIRECT_URI');
  if (!appRedirectUri.startsWith('ww://')) {
    throw new Error('EXPO_APP_REDIRECT_URI must use the ww:// app scheme.');
  }

  return {
    googleClientId: requiredEnv('GOOGLE_CLIENT_ID'),
    googleClientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    googleRedirectUri,
    appRedirectUri,
    stateSecret: requiredEnv('NEXTAUTH_SECRET'),
    djangoApiBase: requiredEnv('NEXT_PUBLIC_API_BASE').replace(/\/+$/, ''),
  };
}

export function signMobileGoogleState(appState: string, appRedirectUri: string) {
  const payload: MobileGoogleState = {
    appState,
    appRedirectUri,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', requiredEnv('NEXTAUTH_SECRET'))
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyMobileGoogleState(value: string): MobileGoogleState {
  const separator = value.lastIndexOf('.');
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error('Invalid OAuth state.');
  }

  const encodedPayload = value.slice(0, separator);
  const suppliedSignature = Buffer.from(value.slice(separator + 1), 'base64url');
  const expectedSignature = createHmac('sha256', requiredEnv('NEXTAUTH_SECRET'))
    .update(encodedPayload)
    .digest();

  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new Error('Invalid OAuth state signature.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid OAuth state payload.');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid OAuth state payload.');
  }

  const state = payload as Record<string, unknown>;
  if (
    typeof state.appState !== 'string' ||
    typeof state.appRedirectUri !== 'string' ||
    typeof state.expiresAt !== 'number' ||
    state.expiresAt < Date.now()
  ) {
    throw new Error('Expired or invalid OAuth state.');
  }

  const configuredAppRedirectUri = requiredEnv('EXPO_APP_REDIRECT_URI');
  if (state.appRedirectUri !== configuredAppRedirectUri) {
    throw new Error('OAuth state contains an unexpected app redirect URI.');
  }

  return {
    appState: state.appState,
    appRedirectUri: state.appRedirectUri,
    expiresAt: state.expiresAt,
  };
}

export function redirectToApp(uri: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const separator = uri.includes('?') ? '&' : '?';
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${uri}${separator}${query}`,
      'Cache-Control': 'no-store',
    },
  });
}
