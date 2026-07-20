/**
 * Meta Marketing API — Ad Account insights & campaign data helper.
 *
 * Used by the admin /ads page to display live ad performance stats.
 * All calls are server-side only (uses META_ACCESS_TOKEN).
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 */

const GRAPH_API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getCredentials() {
  const token = process.env.META_ACCESS_TOKEN;
  const rawId = process.env.META_AD_ACCOUNT_ID ?? "";
  if (!token || !rawId) return null;
  const accountId = rawId.startsWith("act_") ? rawId : `act_${rawId}`;
  return { token, accountId };
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdInsights {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpm: string;
  reach: string;
  dateStart: string;
  dateStop: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  spend: string;
  impressions: string;
  clicks: string;
}

export interface AdsData {
  insights: AdInsights | null;
  campaigns: Campaign[];
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function graphFetch<T>(path: string, token: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${separator}access_token=${token}`, {
    next: { revalidate: 300 } // cache for 5 min
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch account-level insights for the last 7 days.
 */
export async function fetchAccountInsights(): Promise<AdInsights | null> {
  const creds = getCredentials();
  if (!creds) return null;

  try {
    const data = await graphFetch<{
      data: Array<{
        spend: string;
        impressions: string;
        clicks: string;
        ctr: string;
        cpm: string;
        reach: string;
        date_start: string;
        date_stop: string;
      }>;
    }>(
      `/${creds.accountId}/insights?fields=spend,impressions,clicks,ctr,cpm,reach&date_preset=last_7d&level=account`,
      creds.token
    );

    const row = data.data?.[0];
    if (!row) return null;

    return {
      spend: row.spend ?? "0",
      impressions: row.impressions ?? "0",
      clicks: row.clicks ?? "0",
      ctr: row.ctr ?? "0",
      cpm: row.cpm ?? "0",
      reach: row.reach ?? "0",
      dateStart: row.date_start,
      dateStop: row.date_stop
    };
  } catch (err) {
    console.error("[meta-ads] fetchAccountInsights error:", err);
    return null;
  }
}

/**
 * Fetch all campaigns in the ad account with their 7-day insights.
 */
export async function fetchCampaigns(): Promise<Campaign[]> {
  const creds = getCredentials();
  if (!creds) return [];

  try {
    const data = await graphFetch<{
      data: Array<{
        id: string;
        name: string;
        status: string;
        objective: string;
        daily_budget?: string;
        lifetime_budget?: string;
        insights?: {
          data: Array<{ spend: string; impressions: string; clicks: string }>;
        };
      }>;
    }>(
      `/${creds.accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights.date_preset(last_7d){spend,impressions,clicks}&limit=20`,
      creds.token
    );

    return (data.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective ?? "—",
      dailyBudget: c.daily_budget ?? null,
      lifetimeBudget: c.lifetime_budget ?? null,
      spend: c.insights?.data?.[0]?.spend ?? "0",
      impressions: c.insights?.data?.[0]?.impressions ?? "0",
      clicks: c.insights?.data?.[0]?.clicks ?? "0"
    }));
  } catch (err) {
    console.error("[meta-ads] fetchCampaigns error:", err);
    return [];
  }
}

/**
 * Combined fetch for the admin ads page.
 */
export async function fetchAdsData(): Promise<AdsData> {
  const creds = getCredentials();
  if (!creds) {
    return {
      insights: null,
      campaigns: [],
      error: "META_ACCESS_TOKEN অথবা META_AD_ACCOUNT_ID সেট করা হয়নি।"
    };
  }

  const [insights, campaigns] = await Promise.all([
    fetchAccountInsights(),
    fetchCampaigns()
  ]);

  return { insights, campaigns };
}
