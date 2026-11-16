# Google sign-in setup

The website's existing NextAuth Google sign-in remains unchanged. Android uses a
separate OAuth broker (BFF) in Next.js: the app starts an authorization-code
flow with PKCE, Google returns to the Next.js HTTPS callback, and Next.js
exchanges the code using the Web OAuth client secret. Django verifies Google's
ID token and returns the Wild Wash API token.

## Environment variables

Configure these on the **Next.js server** (local `wildwash/.env` and the
production hosting environment):

```dotenv
GOOGLE_MOBILE_REDIRECT_URI=https://www.wildwash.co.ke/api/mobile-auth/google/callback
EXPO_APP_REDIRECT_URI=ww://
```

The server also needs the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`NEXTAUTH_SECRET`, and `NEXT_PUBLIC_API_BASE`. Use the same Google **Web
application** client ID and secret already used by NextAuth. Keep the secret
server-side; do not put it in Expo or Django. `NEXT_PUBLIC_API_BASE` is the
Django API origin without a path prefix (for example,
`https://api.wildwash.co.ke` in production); the API routes are mounted at the
origin root.

Configure Django (`wild-wash-api/.env` and the production API hosting
environment) with:

```dotenv
GOOGLE_OAUTH_CLIENT_IDS=your_google_web_client_id
```

Use the Web client ID, not its secret. This allowlist is used by Django to
verify the ID token before it issues a Wild Wash API token.

The Expo app uses the non-secret base URL `EXPO_PUBLIC_AUTH_BASE_URL` (already
set in `ww/.env` and the EAS build profiles). Do not add Google client IDs or
the client secret to `EXPO_PUBLIC_*` variables.

## Google Cloud Console

For the same Web OAuth client, keep the website callback and add this
authorized redirect URI:

```text
https://www.wildwash.co.ke/api/auth/callback/google
https://www.wildwash.co.ke/api/mobile-auth/google/callback
```

The first URI is NextAuth's website callback; the second is the Android BFF
callback. `ww://` is only the app return URI and is not registered with Google.

## Test

1. Set the server and Django environment variables above in local and production
   environments. Do not commit credentials.
2. Register the BFF callback in Google Cloud Console.
3. Use an installed app or Expo development build with the `ww` URL scheme;
   Expo Go does not support this native OAuth return flow.
4. Sign in from the Android app. Django's `/users/google-auth/mobile/` endpoint
   verifies the ID token and returns the same token-and-user shape consumed by
   the app. NextAuth's normal website sign-in continues through its own route.
