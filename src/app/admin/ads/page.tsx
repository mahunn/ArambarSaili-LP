import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { fetchAdsData } from "@/lib/meta-ads";

function fmt(n: string | number, decimals = 0): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "—";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    PAUSED: "bg-amber-100 text-amber-700",
    DELETED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-slate-100 text-slate-500"
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

export default async function AdsPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { insights, campaigns, error } = await fetchAdsData();

  const statCards = insights
    ? [
        { label: "মোট খরচ (৭ দিন)", value: `৳${fmt(insights.spend)}`, sub: `${insights.dateStart} – ${insights.dateStop}` },
        { label: "ইম্প্রেশন", value: fmt(insights.impressions), sub: "মোট দেখা হয়েছে" },
        { label: "ক্লিক", value: fmt(insights.clicks), sub: "লিংকে ক্লিক" },
        { label: "CTR", value: `${fmt(insights.ctr, 2)}%`, sub: "ক্লিক-থ্রু রেট" },
        { label: "CPM", value: `৳${fmt(insights.cpm, 2)}`, sub: "প্রতি ১০০০ ইম্প্রেশন" },
        { label: "রিচ", value: fmt(insights.reach), sub: "ইউনিক ব্যবহারকারী" }
      ]
    : [];

  const hasCredentials = !error?.includes("সেট করা হয়নি");

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">বিজ্ঞাপন ড্যাশবোর্ড</h2>
        <p className="text-sm text-slate-500">
          Meta Ads Manager — গত ৭ দিনের পারফরম্যান্স
        </p>
      </div>

      {/* Error / not configured */}
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold">⚠️ কনফিগারেশন প্রয়োজন</p>
          <p className="mt-1">{error}</p>
          {!hasCredentials && (
            <p className="mt-2 text-xs text-amber-700">
              Vercel Dashboard → Settings → Environment Variables-এ{" "}
              <code className="rounded bg-amber-100 px-1">META_ACCESS_TOKEN</code>,{" "}
              <code className="rounded bg-amber-100 px-1">META_AD_ACCOUNT_ID</code> এবং{" "}
              <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_META_PIXEL_ID</code>{" "}
              যোগ করুন।
            </p>
          )}
        </div>
      )}

      {/* Insights stat cards */}
      {statCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100"
            >
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
            </article>
          ))}
        </div>
      )}

      {/* Placeholder cards when no data yet */}
      {!insights && hasCredentials && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["মোট খরচ", "ইম্প্রেশন", "ক্লিক", "CTR", "CPM", "রিচ"].map((label) => (
            <article
              key={label}
              className="animate-pulse rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100"
            >
              <p className="text-sm font-medium text-slate-400">{label}</p>
              <div className="mt-3 h-7 w-24 rounded-lg bg-slate-100" />
            </article>
          ))}
        </div>
      )}

      {/* Campaigns table */}
      <section className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">ক্যাম্পেইন তালিকা</h3>
          <p className="text-xs text-slate-400 mt-0.5">গত ৭ দিনের ডেটা</p>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            {hasCredentials ? "কোনো ক্যাম্পেইন পাওয়া যায়নি।" : "এনভায়রনমেন্ট ভ্যারিয়েবল সেট করুন।"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">ক্যাম্পেইন নাম</th>
                  <th className="px-4 py-3 font-medium">স্ট্যাটাস</th>
                  <th className="px-4 py-3 font-medium text-right">খরচ</th>
                  <th className="px-4 py-3 font-medium text-right">ইম্প্রেশন</th>
                  <th className="px-4 py-3 font-medium text-right">ক্লিক</th>
                  <th className="px-4 py-3 font-medium">বাজেট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">৳{fmt(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(c.impressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(c.clicks)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.dailyBudget
                        ? `৳${fmt(c.dailyBudget)}/দিন`
                        : c.lifetimeBudget
                          ? `৳${fmt(c.lifetimeBudget)} (মোট)`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pixel status indicator */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm shadow-[0_4px_16px_rgb(0,0,0,0.03)]">
        <span className={`h-2.5 w-2.5 rounded-full ${process.env.NEXT_PUBLIC_META_PIXEL_ID ? "bg-emerald-400" : "bg-amber-400"}`} />
        <span className="text-slate-600">
          Facebook Pixel:{" "}
          <span className="font-medium">
            {process.env.NEXT_PUBLIC_META_PIXEL_ID
              ? `সক্রিয় (ID: ${process.env.NEXT_PUBLIC_META_PIXEL_ID})`
              : "সেট করা হয়নি"}
          </span>
        </span>
      </div>
    </section>
  );
}
