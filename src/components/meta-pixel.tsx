"use client";

/**
 * Facebook Pixel — client-side tracking component.
 *
 * Drop this into the root layout once. It will:
 *   • Inject the base Pixel code via next/script
 *   • Fire PageView automatically on every route change
 *   • Export helper functions for custom events
 *
 * The Pixel ID is read from NEXT_PUBLIC_META_PIXEL_ID.
 */

import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

let globalTestEventCode = "";

// ── Event helpers (importable from anywhere) ───────────────────────────────

/** Track a ViewContent event (product page view). */
export function trackViewContent(opts: {
  contentName: string;
  value?: number;
  currency?: string;
}) {
  if (typeof window === "undefined" || !window.fbq) return;
  const customData: Record<string, unknown> = {
    content_name: opts.contentName,
    value: opts.value,
    currency: opts.currency ?? "BDT"
  };
  const extraOpts: Record<string, unknown> = {};
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  window.fbq("track", "ViewContent", customData, extraOpts);
}

/** Track InitiateCheckout when the order form is engaged. */
export function trackInitiateCheckout(opts: { value?: number; currency?: string }) {
  if (typeof window === "undefined" || !window.fbq) return;
  const customData: Record<string, unknown> = {
    value: opts.value,
    currency: opts.currency ?? "BDT"
  };
  const extraOpts: Record<string, unknown> = {};
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  window.fbq("track", "InitiateCheckout", customData, extraOpts);
}

/**
 * Track a Purchase event.
 * Pass the same eventId used in the server-side CAPI call for deduplication.
 */
export function trackPurchase(opts: {
  eventId: string;
  value: number;
  currency?: string;
  contentName?: string;
  numItems?: number;
}) {
  if (typeof window === "undefined" || !window.fbq) return;
  const customData: Record<string, unknown> = {
    value: opts.value,
    currency: opts.currency ?? "BDT",
    content_name: opts.contentName ?? "",
    num_items: opts.numItems ?? 1,
    content_type: "product"
  };
  const extraOpts: Record<string, unknown> = { eventID: opts.eventId };
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  window.fbq("track", "Purchase", customData, extraOpts);
}

// ── Component ──────────────────────────────────────────────────────────────

function PixelPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel({
  pixelId,
  testEventCode
}: {
  pixelId?: string;
  testEventCode?: string;
}) {
  const activePixelId = pixelId || PIXEL_ID;

  useEffect(() => {
    if (testEventCode) {
      globalTestEventCode = testEventCode;
    }
  }, [testEventCode]);

  if (!activePixelId) return null;

  return (
    <>
      {/* Facebook Pixel base code */}
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s){
              if(f.fbq)return;
              n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];
              t=b.createElement(e);t.async=!0;
              t.src=v;
              s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)
            }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${activePixelId}');
            ${testEventCode ? `fbq('set', 'options', 'custom', {test_event_code: '${testEventCode}'});` : ""}
            fbq('track', 'PageView');
          `
        }}
      />
      {/* Noscript fallback */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1${testEventCode ? `&cd[test_event_code]=${testEventCode}` : ""}`}
          alt=""
        />
      </noscript>
      {/* Route-change tracker */}
      <PixelPageViewTracker />
    </>
  );
}
