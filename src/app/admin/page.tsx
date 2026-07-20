import { redirect } from "next/navigation";
import { readOrders } from "@/lib/order-store";
import { isAuthenticated } from "@/lib/auth";
export default async function AdminHomePage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");
  const orders = await readOrders();
  const stats = [
    { label: "মোট অর্ডার", value: String(orders.length) },
    { label: "পেন্ডিং", value: String(orders.filter((o) => o.status === "pending").length) },
    { label: "ডেলিভারি", value: String(orders.filter((o) => o.status === "delivered").length) },
    { label: "বাতিল", value: String(orders.filter((o) => o.status === "canceled").length) }
  ];

  return (
    <section className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl font-semibold">ড্যাশবোর্ড</h2>
        <p className="text-sm text-slate-600">আপনার দোকানের অর্ডার ও কন্ট্রোল এখানে দেখা যাবে।</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </div>

      <section className="rounded-3xl bg-white p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
        <h3 className="font-semibold">সর্বশেষ অর্ডার</h3>
        <div className="mt-3 space-y-2">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-3">
              <div>
                <p className="text-sm font-medium">{order.id}</p>
                <p className="text-xs text-slate-500">
                  {order.customerName} - ৳{Math.round(order.totalPrice)}
                </p>
              </div>
              <a href={`/admin/orders/${encodeURIComponent(order.id)}`} className="text-xs font-semibold text-slate-700">
                বিস্তারিত
              </a>
            </div>
          ))}
          {orders.length === 0 ? <p className="text-sm text-slate-500">এখনও কোনো অর্ডার নেই।</p> : null}
        </div>
      </section>
    </section>
  );
}
