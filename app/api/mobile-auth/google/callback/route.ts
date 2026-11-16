import {
  getMobileGoogleConfig,
  redirectToApp,
  verifyMobileGoogleState,
} from '@/lib/mobileGoogleOAuth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const stateValue = requestUrl.searchParams.get('state');
  if (!stateValue) {
    return new Response('Missing OAuth state.', { status: 400 });
  }

  let state;
  try {
    state = verifyMobileGoogleState(stateValue);
  } catch {
    return new Response('Invalid or expired OAuth state.', { status: 400 });
  }

  const error = requestUrl.searchParams.get('error');
  if (error) {
    return redirectToApp(state.appRedirectUri, {
      error: 'access_denied',
      state: state.appState,
    });
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return redirectToApp(state.appRedirectUri, {
      error: 'missing_code',
      state: state.appState,
    });
  }

  getMobileGoogleConfig();
  return redirectToApp(state.appRedirectUri, { code, state: state.appState });
}
