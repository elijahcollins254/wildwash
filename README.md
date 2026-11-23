# Wild Wash Next.js

## Google Maps pickup maps

The pickup maps on booking, customer profile, and washer profile use the Google
Maps JavaScript API. Configure a browser API key in the Next.js environment:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
```

In Google Cloud Console, enable billing and **Maps JavaScript API**, then create
or select the key under **Google Maps Platform → Keys & Credentials**. Restrict
the key to the website's HTTP referrers (including local development origins)
and to **Maps JavaScript API**. This key is exposed to the browser by design;
referrer and API restrictions are essential. Set it in the local `wildwash/.env`
and in the hosting provider's environment configuration, then restart/redeploy
Next.js.

On booking and profile maps, choose **Use my location** and allow location
access in the browser. The browser geolocation API requires HTTPS except on
localhost. The user can also tap the map or drag the pin to select a location.

## Meta Conversions API

The Meta Pixel and Conversions API send `Search`, `ViewContent`, `AddToCart`,
`InitiateCheckout`, and fully paid `Purchase` events only after a visitor accepts
marketing cookies. The cookie settings control is available after a choice is
made. Purchase events use the same event ID in the browser and server requests
for Meta deduplication.

Configure these values in the Next.js hosting environment. Keep the access token
server-only; do not prefix it with `NEXT_PUBLIC_` or commit it to source control:

```dotenv
META_CAPI_ACCESS_TOKEN=your_conversions_api_access_token
META_CAPI_API_VERSION=vXX.Y
NEXT_PUBLIC_META_PIXEL_ID=1155299660416025
```

Set `META_CAPI_API_VERSION` to a currently supported Graph API version. The
Pixel ID defaults to the existing Wild Wash Pixel ID shown above. The
Conversions API access token must remain a server-only environment variable.
