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
