import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readProductData } from "@/lib/product-store";
import { UnifiedProductEditor } from "@/components/admin/unified-product-editor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminProductPage({
  searchParams
}: {
  searchParams?: Promise<{ notice?: string; tone?: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const params = searchParams ? await searchParams : {};
  const product = await readProductData();

  return (
    <section className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      {/* Notice Banner */}
      {params.notice && (
        <div
          className={`rounded-2xl p-4 text-sm font-semibold border flex items-center justify-between shadow-xs ${
            params.tone === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{params.tone === "error" ? "⚠️" : "✅"}</span>
            <span>{params.notice}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">পণ্য সেটিংস (Product Settings)</h2>
          <p className="text-sm text-slate-500 mt-1">
            এখানে পণ্যের মূল্য, বিবরণ ও সব কালার ভ্যারিয়েন্ট একসাথে এডিট ও ১ ক্লিকে সেভ করতে পারবেন।
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 self-start md:self-auto border border-emerald-200/60 shadow-xs">
          ✨ সকল তথ্য ও ছবি ১টি মাস্টার সেভ বাটনে সেভ হবে
        </div>
      </div>

      {/* Unified Master Product & Color Variants Editor */}
      <UnifiedProductEditor initialProduct={product} />
    </section>
  );
}
