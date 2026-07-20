import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { isAuthenticated } from "@/lib/auth";
import { formatDateTimeDhaka } from "@/lib/datetime-bd";
import { readOrders } from "@/lib/order-store";

type InvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { id } = await params;
  const orderId = decodeURIComponent(id);
  const orders = await readOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl p-4 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="text-sm text-emerald-700">
          অর্ডারে ফিরে যান
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-xl font-bold">আড়ম্বর শৈলী ইনভয়েস</h1>
          <p className="text-sm text-slate-500">অর্ডার {order.id}</p>
          <p className="text-sm text-slate-500">{formatDateTimeDhaka(order.createdAt)}</p>
        </header>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">কাস্টমার</h2>
            <p className="text-sm">{order.customerName}</p>
            <p className="text-sm">{order.customerPhone}</p>
            <p className="text-sm">{order.customerAddress}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">অর্ডার তথ্য</h2>
            <p className="text-sm">স্ট্যাটাস: {order.status}</p>
            {!order.items || order.items.length === 0 ? (
              <>
                <p className="text-sm">কালার: {order.selectedColor}</p>
                <p className="text-sm">সাইজ: {order.selectedSize}</p>
              </>
            ) : (
              <p className="text-sm">আইটেম সংখ্যা: {order.items.length}টি</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="grid grid-cols-4 border-b border-slate-200 pb-2 text-sm font-semibold">
            <p className="col-span-2">পণ্য</p>
            <p className="text-right">পরিমাণ</p>
            <p className="text-right">মূল্য</p>
          </div>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-4 py-2.5 text-sm border-b border-slate-100 last:border-b-0">
                <p className="col-span-2">
                  {order.productTitle} - <span className="text-slate-500">{item.color} ({item.size})</span>
                </p>
                <p className="text-right">{item.quantity}</p>
                <p className="text-right">৳{Math.round(order.unitPrice * item.quantity)}</p>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-4 py-3 text-sm">
              <p className="col-span-2">
                {order.productTitle} - <span className="text-slate-500">{order.selectedColor} ({order.selectedSize})</span>
              </p>
              <p className="text-right">{order.quantity}</p>
              <p className="text-right">৳{Math.round(order.totalPrice)}</p>
            </div>
          )}
          <div className="space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between">
              <p>ইউনিট দাম</p>
              <p>৳{Math.round(order.unitPrice)}</p>
            </div>
            <div className="flex justify-between font-semibold border-t border-slate-100 pt-1.5 mt-1.5">
              <p>মোট পরিমাণ</p>
              <p>{order.quantity} পিস</p>
            </div>
            <div className="flex justify-between font-semibold">
              <p>সর্বমোট মূল্য</p>
              <p>৳{Math.round(order.totalPrice)}</p>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
