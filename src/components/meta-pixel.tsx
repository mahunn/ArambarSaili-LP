"use client";

/**
 * Facebook Pixel — client-side tracking component.
 *
 * Injects the Meta Pixel script and tracks:
 *   • PageView on initial load and route changes (without duplicates)
 *   • ViewContent (product view)
 *   • InitiateCheckout (order initiation)
 *   • Purchase (order completion, with deduplication eventID for CAPI)
 *   • Contact (WhatsApp & Call clicks)
 */

import Script from "next/script";
import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const DEFAULT_PIXEL_ID = "1022935187223903";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || DEFAULT_PIXEL_ID;

let globalTestEventCode = "";

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: FbqFunction;
  loaded?: boolean;
  version?: string;
}

/**
 * Safe invocation helper that calls window.fbq or queues the call
 * if the Meta Pixel SDK is still downloading.
 */
function callFbq(...args: unknown[]) {
  if (typeof window === "undefined") return;

  if (!window.fbq) {
    const fbq: FbqFunction = function (...a: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, a);
      } else {
        fbq.queue.push(a);
      }
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
  }

  window.fbq(...args);
}

// ── Event helpers (importable from anywhere) ───────────────────────────────

/** Track a PageView event manually */
export function trackPageView() {
  callFbq("track", "PageView");
}

/** Track a ViewContent event (product page view). */
export function trackViewContent(opts: {
  contentName: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
}) {
  const customData: Record<string, unknown> = {
    content_name: opts.contentName,
    content_type: "product",
    value: opts.value,
    currency: opts.currency ?? "BDT"
  };
  if (opts.contentIds && opts.contentIds.length > 0) {
    customData.content_ids = opts.contentIds;
  }
  const extraOpts: Record<string, unknown> = {};
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  callFbq("track", "ViewContent", customData, extraOpts);
}

/** Track InitiateCheckout when the order form is engaged. */
export function trackInitiateCheckout(opts: {
  value?: number;
  currency?: string;
  contentName?: string;
  numItems?: number;
  contentIds?: string[];
}) {
  const customData: Record<string, unknown> = {
    value: opts.value,
    currency: opts.currency ?? "BDT",
    content_type: "product"
  };
  if (opts.contentName) customData.content_name = opts.contentName;
  if (opts.numItems) customData.num_items = opts.numItems;
  if (opts.contentIds && opts.contentIds.length > 0) {
    customData.content_ids = opts.contentIds;
  }
  const extraOpts: Record<string, unknown> = {};
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  callFbq("track", "InitiateCheckout", customData, extraOpts);
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
  contentIds?: string[];
}) {
  const customData: Record<string, unknown> = {
    value: opts.value,
    currency: opts.currency ?? "BDT",
    content_name: opts.contentName ?? "",
    num_items: opts.numItems ?? 1,
    content_type: "product"
  };
  if (opts.contentIds && opts.contentIds.length > 0) {
    customData.content_ids = opts.contentIds;
  }
  const extraOpts: Record<string, unknown> = { eventID: opts.eventId };
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  callFbq("track", "Purchase", customData, extraOpts);
}

/** Track Contact event (WhatsApp / Call button clicks). */
export function trackContact(opts?: { method?: string; contentName?: string }) {
  const customData: Record<string, unknown> = {
    content_name: opts?.contentName ?? "Customer Contact",
    method: opts?.method ?? "whatsapp"
  };
  const extraOpts: Record<string, unknown> = {};
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  callFbq("track", "Contact", customData, extraOpts);
}

/** Track a custom event. */
export function trackCustom(eventName: string, data?: Record<string, unknown>) {
  const extraOpts: Record<string, unknown> = {};
  if (globalTestEventCode) {
    extraOpts.test_event_code = globalTestEventCode;
  }
  callFbq("trackCustom", eventName, data ?? {}, extraOpts);
}

// ── Component ──────────────────────────────────────────────────────────────

function PixelPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip firing on the initial render since the inline script already tracked PageView
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    callFbq("track", "PageView");
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
  const activePixelId = pixelId || PIXEL_ID || DEFAULT_PIXEL_ID;

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
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
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
      {/* Route-change tracker in Suspense boundary */}
      <Suspense fallback={null}>
        <PixelPageViewTracker />
      </Suspense>
    </>
  );
}
