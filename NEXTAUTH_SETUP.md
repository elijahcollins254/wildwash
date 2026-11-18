# Google sign-in setup

The website uses NextAuth as the server-side OAuth broker. Google redirects to
NextAuth, which forwards Google's ID token to Django. Django verifies the token
and returns the Wild Wash API token. The Expo app uses a separate authorization
code flow with PKCE through a Next.js callback.

## Environment variables

Configure these on the **Next.js server** (local `wildwash/.env` and the
production hosting environment):

```dotenv
GOOGLE_MOBILE_REDIRECT_URI=https://www.wildwash.co.ke/api/mobile-auth/google/callback
EXPO_APP_REDIRECT_URI=ww://
```

The Next.js server also needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`NEXTAUTH_SECRET`, and `NEXT_PUBLIC_API_BASE`. Use the Google **Web application**
client ID and secret. Keep the secret server-side; do not put it in Expo or
Django. `NEXT_PUBLIC_API_BASE` is the Django API origin without a path prefix
(for example, `https://api.wildwash.co.ke` in production or
`http://localhost:8000` locally).

Configure Django (`wild-wash-api/.env` and the production API hosting
environment) with:

```dotenv
GOOGLE_OAUTH_CLIENT_IDS=your_google_web_client_id
```

Use the same Web client ID as `GOOGLE_CLIENT_ID`, not the secret. Django uses
this allowlist to verify the ID token before it issues an API token. Both the
website and Expo call `/users/google-auth/mobile/`; the previous
`/users/google-auth/` endpoint accepted unverified profile fields and has been
removed.

The Expo app uses the non-secret base URL `EXPO_PUBLIC_AUTH_BASE_URL` (already
set in `ww/.env` and the EAS build profiles). Do not add Google client IDs or
the client secret to `EXPO_PUBLIC_*` variables.

## AWS Amplify Hosting

The frontend's `amplify.yml` runs `scripts/writeAmplifyEnv.mjs` before the build.
It writes the Amplify branch's required variables to `.env.production` so
Next.js server-side routes can read them. Set these variables in the Amplify
environment for the deployed branch:

- `NEXT_PUBLIC_API_BASE`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` or `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

The build maps the Google client ID to both names; the public name is available
to browser code, while the existing server-side Google and mobile OAuth flows
continue to use `GOOGLE_CLIENT_ID`. The Google client ID is public; never prefix
the client secret or NextAuth secret with `NEXT_PUBLIC_`.

The generated `.env.production` is git-ignored and is not committed. It contains
the server secrets in the Amplify deployment artifact; restrict artifact access
accordingly. AWS documents this SSR environment-variable pattern and its
artifact-access warning in the
[Amplify SSR environment variables guide](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html).

## Google Cloud Console

For the same Web OAuth client, keep the website callback and add this
authorized redirect URI:

```text
https://www.wildwash.co.ke/api/auth/callback/google
https://www.wildwash.co.ke/api/mobile-auth/google/callback
http://localhost:3000/api/auth/callback/google
```

The first URI is the production website callback, the second is the Expo BFF
callback, and the third is NextAuth's local website callback. Add the localhost
URI while developing locally. `ww://` is only the app return URI and is not
registered with Google. The URI must exactly match `NEXTAUTH_URL` plus
`/api/auth/callback/google`.

## Debug website sign-in

The page reload is normal: OAuth leaves the login page and returns to it after
Google responds. In browser DevTools, inspect Network for `/api/auth/signin/google`
and `/api/auth/callback/google`. Next.js callback diagnostics appear in the
terminal running the website; Django logs appear only after that callback posts
to `/users/google-auth/mobile/`. If Django has no request, first check Google's
redirect URI, the callback request status, and that `NEXT_PUBLIC_API_BASE`
points to the Django server reachable from Next.js. A missing or rejected ID
token will be reported in Next.js logs; Django requires
`GOOGLE_OAUTH_CLIENT_IDS` to be set.

## Test

1. Set the server and Django environment variables above in local and production
   environments. Do not commit credentials.
2. Register the matching website callback URI in Google Cloud Console. For
   local development, this is `http://localhost:3000/api/auth/callback/google`.
3. Start Next.js and Django, then try **Continue with Google** on `/login`.
   After Google's redirect, confirm the Next.js terminal logs token verification
   and Django receives `/users/google-auth/mobile/`.
4. Register the BFF callback in Google Cloud Console.
5. Use an installed app or Expo development build with the `ww` URL scheme;
   Expo Go does not support this native OAuth return flow.
6. Sign in from the Android app. Django's `/users/google-auth/mobile/` endpoint
   verifies the ID token and returns the same token-and-user shape consumed by
   the app.
