import {
  getMobileGoogleConfig,
  signMobileGoogleState,
} from '@/lib/mobileGoogleOAuth';

export const runtime = 'nodejs';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;
  const config = getMobileGoogleConfig();
  const appState = params.get('state');
  const appRedirectUri = params.get('redirect_uri');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method');

  if (
    params.get('client_id') !== 'google' ||
    params.get('response_type') !== 'code' ||
    !appState ||
    appState.length > 2048 ||
    appRedirectUri !== config.appRedirectUri ||
    !codeChallenge ||
    !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge) ||
    codeChallengeMethod !== 'S256'
  ) {
    return Response.json({ error: 'Invalid Google authorization request.' }, { status: 400 });
  }

  const googleUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  googleUrl.search = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state: signMobileGoogleState(appState, appRedirectUri),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: googleUrl.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
