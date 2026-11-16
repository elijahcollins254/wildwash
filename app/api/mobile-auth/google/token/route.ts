import { getMobileGoogleConfig } from '@/lib/mobileGoogleOAuth';

export const runtime = 'nodejs';

type GoogleTokenResponse = {
  id_token?: unknown;
  error?: unknown;
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ detail: 'Invalid request body.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return Response.json({ detail: 'Invalid request body.' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const code = body.code;
  const codeVerifier = body.code_verifier;
  if (
    typeof code !== 'string' ||
    code.length === 0 ||
    code.length > 4096 ||
    typeof codeVerifier !== 'string' ||
    !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)
  ) {
    return Response.json({ detail: 'Authorization code or PKCE verifier is invalid.' }, { status: 400 });
  }

  const config = getMobileGoogleConfig();
  const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectUri,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
    }),
    cache: 'no-store',
  });

  let googlePayload: GoogleTokenResponse;
  try {
    googlePayload = await googleResponse.json() as GoogleTokenResponse;
  } catch {
    return Response.json({ detail: 'Google returned an invalid token response.' }, { status: 502 });
  }

  if (!googleResponse.ok || typeof googlePayload.id_token !== 'string') {
    return Response.json({ detail: 'Google authorization code exchange failed.' }, { status: 401 });
  }

  const djangoResponse = await fetch(`${config.djangoApiBase}/users/google-auth/mobile/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ id_token: googlePayload.id_token }),
    cache: 'no-store',
  });

  let djangoPayload: unknown;
  try {
    djangoPayload = await djangoResponse.json();
  } catch {
    return Response.json({ detail: 'The Wild Wash API returned an invalid response.' }, { status: 502 });
  }

  return Response.json(djangoPayload, {
    status: djangoResponse.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
