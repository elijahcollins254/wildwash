"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1155299660416025";
const CONSENT_COOKIE = "wildwash_marketing_consent";

type Consent = "checking" | "unknown" | "granted" | "denied";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function MetaPixel() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [consent, setConsent] = useState<Consent>("checking");
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const storedConsent = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
      ?.split("=")[1];

    setConsent(storedConsent === "granted" || storedConsent === "denied" ? storedConsent : "unknown");
  }, []);

  useEffect(() => {
    if (consent !== "granted" || previousPathname.current === pathname) {
      previousPathname.current = pathname;
      return;
    }

    previousPathname.current = pathname;
    window.fbq?.("track", "PageView");
  }, [consent, pathname]);

  const chooseConsent = (choice: "granted" | "denied") => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
    window.fbq?.("consent", choice === "granted" ? "grant" : "revoke");
    setConsent(choice);
    setShowPreferences(false);
  };

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document, 'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
      {consent === "unknown" || showPreferences ? (
        <aside
          aria-label="Marketing cookie preferences"
          className="fixed bottom-24 left-4 z-[100] max-w-md rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <p className="text-sm">
            Allow marketing cookies? Meta Pixel and Conversions API help us measure visits and purchases using
            your IP address and browser information. You can change this choice later.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => chooseConsent("granted")}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => chooseConsent("denied")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Reject
            </button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setShowPreferences(true)}
          className="fixed bottom-24 left-4 z-[99] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Cookie settings
        </button>
      )}
    </>
  );
}
