"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { XMarkIcon } from "@heroicons/react/24/outline";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1155299660416025";
const CONSENT_COOKIE = "wildwash_marketing_consent";
const DISMISSED_PROMPT_KEY = "wildwash_marketing_prompt_dismissed";

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
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    const storedConsent = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
      ?.split("=")[1];

    setPromptDismissed(localStorage.getItem(DISMISSED_PROMPT_KEY) === "true");
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
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    window.fbq?.("consent", choice === "granted" ? "grant" : "revoke");
    setConsent(choice);
    setShowPreferences(false);
  };

  const dismissPrompt = () => {
    localStorage.setItem(DISMISSED_PROMPT_KEY, "true");
    setPromptDismissed(true);
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
      {(consent === "unknown" && !promptDismissed) || showPreferences ? (
        <aside
          aria-label="Marketing cookie preferences"
          className="fixed bottom-24 left-3 z-[100] w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 pr-9 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <button
            type="button"
            onClick={dismissPrompt}
            aria-label="Dismiss cookie preferences"
            className="absolute right-2 top-2 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          <p className="text-xs leading-relaxed">
            Allow marketing cookies? Meta Pixel and Conversions API help us measure visits and purchases using
            your IP address and browser information. You can change this choice later.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => chooseConsent("granted")}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => chooseConsent("denied")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Reject
            </button>
          </div>
        </aside>
      ) : consent !== "checking" ? (
        <button
          type="button"
          onClick={() => setShowPreferences(true)}
          className="fixed bottom-24 left-3 z-[99] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Cookie settings
        </button>
      ) : null}
    </>
  );
}
