import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteOrder, updateOrderStatus } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { OrderCopyButtons } from "@/components/admin/order-copy-buttons";
import { isAuthenticated } from "@/lib/auth";
import { formatDateTimeDhaka } from "@/lib/datetime-bd";
import { readOrders } from "@/lib/order-store";
import { toBdInternationalDigits } from "@/lib/phone-bd";

type OrdersPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const orders = await readOrders();
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status ?? "all").toLowerCase();
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const perPage = 10;

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" ? true : order.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;
    const haystack = [order.id, order.customerName, order.customerPhone, order.customerAddress].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * perPage, safePage * perPage);
  const incompleteOrders = orders.filter((o) => o.status === "pending" || o.status === "confirmed" || o.status === "shipped");
  const allIncompleteText = incompleteOrders
    .map((o) => {
      const itemDetails = o.items && o.items.length > 0
        ? o.items.map((i) => `${i.color}/${i.size} x${i.quantity}`).join(", ")
        : `${o.selectedColor}/${o.selectedSize} x${o.quantity}`;
      return `${o.id} | ${o.customerName} | ${o.customerPhone} | ${o.customerAddress} | ${itemDetails} | ৳${Math.round(o.totalPrice)} | ${o.status}`;
    })
    .join("\n");
  const stats = [
    { label: "মোট", value: orders.length },
    { label: "পেন্ডিং", value: orders.filter((o) => o.status === "pending").length },
    { label: "কনফার্ম", value: orders.filter((o) => o.status === "confirmed").length },
    { label: "শিপড", value: orders.filter((o) => o.status === "shipped").length },
    { label: "ডেলিভারড", value: orders.filter((o) => o.status === "delivered").length },
    { label: "বাতিল", value: orders.filter((o) => o.status === "canceled").length }
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">অর্ডার তালিকা</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((item) => (
          <article key={item.label} className="rounded-3xl bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </div>
      <section className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            দেখানো হচ্ছে {paginatedOrders.length} / {filteredOrders.length}
          </p>
          <OrderCopyButtons allIncompleteText={allIncompleteText || undefined} />
        </div>
        <form className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="অর্ডার আইডি, নাম, ফোন দিয়ে সার্চ"
            className="admin-input"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="admin-input"
          >
            <option value="all">সব স্ট্যাটাস</option>
            <option value="pending">পেন্ডিং</option>
            <option value="confirmed">কনফার্ম</option>
            <option value="shipped">শিপড</option>
            <option value="delivered">ডেলিভারড</option>
            <option value="canceled">বাতিল</option>
          </select>
          <button className="admin-btn-primary">ফিল্টার</button>
          <a
            href="/admin/orders"
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            রিসেট
          </a>
        </form>

        <div className="mt-3 space-y-3">
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-slate-500">এখনও কোনো অর্ডার নেই।</p>
          ) : (
            paginatedOrders.map((order) => {
              const singleItemText = order.items && order.items.length > 0
                ? order.items.map((i) => `${i.color}/${i.size} x${i.quantity}`).join(", ")
                : `${order.selectedColor}/${order.selectedSize} x${order.quantity}`;
              return (
                <article key={order.id} className="relative rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-slate-50/40">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(order.id)}`}
                    aria-label={`${order.id} order details`}
                    className="absolute inset-0 z-0 rounded-lg"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="relative z-10 text-sm font-semibold">{order.id}</p>
                    <p className="relative z-10 text-xs text-slate-500">{formatDateTimeDhaka(order.createdAt)}</p>
                  </div>
                  <div className="relative z-10 mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {order.status}
                  </div>
                  <p className="relative z-10 mt-1 text-sm">
                    {order.customerName} ({order.customerPhone})
                  </p>
                  <p className="relative z-10 text-xs text-slate-600">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <span key={idx}>
                          {idx > 0 && ", "}
                          {item.color} / {item.size} x{item.quantity}
                        </span>
                      ))
                    ) : (
                      <>{order.selectedColor} / {order.selectedSize} x{order.quantity}</>
                    )}
                    {" - "}৳{Math.round(order.totalPrice)}
                  </p>
                  <p className="relative z-10 mt-1 text-xs text-slate-500">{order.customerAddress}</p>
                  <form action={updateOrderStatus} className="relative z-10 mt-2 flex items-center gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/admin/orders?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(statusFilter)}&page=${safePage}`}
                    />
                    <select
                      name="status"
                      defaultValue={order.status}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs"
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="canceled">canceled</option>
                    </select>
                    <button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">আপডেট</button>
                  </form>
                  <div className="relative z-10 mt-2 flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/${toBdInternationalDigits(order.customerPhone)}?text=${encodeURIComponent(`আপনার অর্ডার ${order.id} নিয়ে যোগাযোগ করা হচ্ছে।`)}`}
                      className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Call
                    </a>
                    <form action={deleteOrder}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={`/admin/orders?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(statusFilter)}&page=${safePage}`}
                      />
                      <ConfirmSubmitButton
                        label="ডিলিট"
                        className="min-h-12 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
                        confirmText="এই অর্ডারটি স্থায়ীভাবে মুছে ফেলতে চান?"
                      />
                    </form>
                    <OrderCopyButtons
                      singleText={`${order.id} | ${order.customerName} | ${order.customerPhone} | ${order.customerAddress} | ${singleItemText} | ৳${Math.round(order.totalPrice)} | ${order.status}`}
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center gap-2">
            {safePage > 1 ? (
              <a
                href={`/admin/orders?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(statusFilter)}&page=${safePage - 1}`}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                আগের
              </a>
            ) : null}
            <span className="text-xs text-slate-600">
              পেজ {safePage} / {totalPages}
            </span>
            {safePage < totalPages ? (
              <a
                href={`/admin/orders?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(statusFilter)}&page=${safePage + 1}`}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                পরের
              </a>
            ) : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}
