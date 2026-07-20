/**
 * Meta Conversions API (CAPI) — server-side event helper.
 *
 * Sends events to the Meta Marketing API so purchases are tracked
 * accurately even when the browser blocks the client-side Pixel.
 * PII (phone numbers) are SHA-256 hashed before transmission.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from "crypto";

const GRAPH_API_VERSION = "v20.0";

/** SHA-256 hash a string (lowercased & trimmed) — required by Meta for PII. */
function hashValue(raw: string): string {
  return createHash("sha256")
    .update(raw.trim().toLowerCase())
    .digest("hex");
}

/** Normalise a Bangladeshi phone number to E.164 without leading zeros. */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip leading 0 and prepend country code 880
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  return "880" + digits;
}

export interface CapiPurchaseData {
  /** ISO-8601 event time. Defaults to now. */
  eventTime?: number;
  /** Deduplication ID — must match the Pixel event_id. */
  eventId: string;
  /** Order total value. */
  value: number;
  /** ISO 4217 currency code. Defaults to "BDT". */
  currency?: string;
  /** Customer phone (raw, will be normalised + hashed). */
  phone?: string;
  /** Product / content name. */
  contentName?: string;
  /** Number of items purchased. */
  numItems?: number;
  /** Source URL of the purchase event. */
  eventSourceUrl?: string;
}

/**
 * Send a Purchase event to Meta's Conversions API.
 * Fires-and-forgets — never throws so it never blocks the order flow.
 */
export async function sendCapiPurchase(data: CapiPurchaseData): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!token) {
    console.warn("[meta-capi] META_ACCESS_TOKEN not set — skipping CAPI.");
    return;
  }

  if (!pixelId) {
    console.warn("[meta-capi] NEXT_PUBLIC_META_PIXEL_ID not set — skipping CAPI.");
    return;
  }

  const userData: Record<string, string> = {};
  if (data.phone) {
    userData.ph = hashValue(normalisePhone(data.phone));
  }

  const testEventCode = process.env.META_TEST_EVENT_CODE;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: data.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: data.eventId,
        event_source_url: data.eventSourceUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "",
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: data.value,
          currency: data.currency ?? "BDT",
          content_name: data.contentName ?? "",
          num_items: data.numItems ?? 1,
          content_type: "product"
        }
      }
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {})
  };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${token}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Don't let this block Next.js shutdown
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[meta-capi] API error ${res.status}:`, body);
    } else {
      console.info("[meta-capi] Purchase event sent:", data.eventId);
    }
  } catch (err) {
    // Non-blocking: log but never propagate
    console.error("[meta-capi] Failed to send event:", err);
  }
}
