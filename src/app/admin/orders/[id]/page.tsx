import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteOrder, updateOrderNote, updateOrderStatus } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { isAuthenticated } from "@/lib/auth";
import { formatDateTimeDhaka } from "@/lib/datetime-bd";
import { readOrders } from "@/lib/order-store";
import { toBdInternationalDigits } from "@/lib/phone-bd";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { id } = await params;
  const orderId = decodeURIComponent(id);
  const orders = await readOrders();
  const order = orders.find((item) => item.id === orderId);

  if (!order) notFound();

  const whatsappText = encodeURIComponent(
    `Hello ${order.customerName}, regarding your order ${order.id} for ${order.productTitle}.`
  );
  const whatsappHref = `https://wa.me/${toBdInternationalDigits(order.customerPhone)}?text=${whatsappText}`;
  const deliveredWhatsappText = encodeURIComponent(
    `Hello ${order.customerName}, your order ${order.id} is now delivered. Thank you for shopping with us.`
  );
  const deliveredWhatsappHref = `https://wa.me/${toBdInternationalDigits(order.customerPhone)}?text=${deliveredWhatsappText}`;
  const callHref = `tel:${order.customerPhone}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">অর্ডার বিস্তারিত</p>
          <h2 className="text-xl font-semibold">{order.id}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${encodeURIComponent(order.id)}/invoice`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ইনভয়েস / প্রিন্ট
          </Link>
          <Link href="/admin" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            অ্যাডমিনে ফিরুন
          </Link>
        </div>
      </div>

      <article className="admin-card">
        <h3 className="font-semibold">কাস্টমার তথ্য</h3>
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <span className="text-slate-500">নাম:</span> {order.customerName}
          </p>
          <p>
            <span className="text-slate-500">ফোন:</span> {order.customerPhone}
          </p>
          <p>
            <span className="text-slate-500">ঠিকানা:</span> {order.customerAddress}
          </p>
          <p>
            <span className="text-slate-500">সময়:</span> {formatDateTimeDhaka(order.createdAt)}
          </p>
        </div>
      </article>

      <article className="admin-card">
        <h3 className="font-semibold">পণ্যের তথ্য</h3>
        <div className="mt-3 space-y-3 text-sm">
          <p>
            <span className="text-slate-500">পণ্য:</span> {order.productTitle}
          </p>
          {order.items && order.items.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2">
              <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider">অর্ডারকৃত আইটেমসমূহ:</p>
              <ul className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <li key={idx} className="py-1.5 flex justify-between items-center text-slate-700">
                    <span>
                      কালার: <span className="font-medium text-slate-900">{item.color}</span>, সাইজ: <span className="font-medium text-slate-900">{item.size}</span>
                    </span>
                    <span className="font-medium text-slate-900">
                      x{item.quantity} (৳{Math.round(order.unitPrice * item.quantity)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p>
                <span className="text-slate-500">কালার:</span> {order.selectedColor}
              </p>
              <p>
                <span className="text-slate-500">সাইজ:</span> {order.selectedSize}
              </p>
              <p>
                <span className="text-slate-500">পরিমাণ:</span> {order.quantity}
              </p>
            </>
          )}
          <p>
            <span className="text-slate-500">ইউনিট দাম:</span> ৳{Math.round(order.unitPrice)}
          </p>
          <p className="font-semibold">
            <span className="text-slate-500 font-normal">মোট পরিমাণ:</span> {order.quantity} পিস
          </p>
          <p className="font-semibold">
            <span className="text-slate-500 font-normal">মোট দাম:</span> ৳{Math.round(order.totalPrice)}
          </p>
          {order.note ? (
            <p>
              <span className="text-slate-500">নোট:</span> {order.note}
            </p>
          ) : null}
        </div>
      </article>

      <article className="admin-card">
        <h3 className="font-semibold">পেমেন্ট সারাংশ</h3>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <p className="text-slate-500">সাবটোটাল</p>
            <p>৳{Math.round(order.unitPrice * order.quantity)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-slate-500">ডিসকাউন্ট</p>
            <p>৳{Math.max(0, Math.round(order.unitPrice * order.quantity - order.totalPrice))}</p>
          </div>
          <div className="flex justify-between font-semibold">
            <p>মোট</p>
            <p>৳{Math.round(order.totalPrice)}</p>
          </div>
        </div>
      </article>

      <article className="admin-card">
        <h3 className="font-semibold">অর্ডার অ্যাকশন</h3>
        <form action={updateOrderStatus} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="returnTo" value={`/admin/orders/${encodeURIComponent(order.id)}`} />
          <select
            name="status"
            defaultValue={order.status}
            className="admin-input"
          >
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="canceled">canceled</option>
          </select>
          <button className="admin-btn-primary">স্ট্যাটাস আপডেট</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={whatsappHref} className="rounded-md bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:bg-[#20BD5A]">
            WhatsApp কাস্টমার
          </a>
          <a href={callHref} className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white">
            কল করুন
          </a>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <p className="text-sm font-semibold">দ্রুত ডেলিভারি অ্যাকশন</p>
          <p className="mt-1 text-xs text-slate-500">ডেলিভারড স্ট্যাটাস দিন, তারপর WhatsApp কনফার্মেশন পাঠান।</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={updateOrderStatus}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value="delivered" />
              <input type="hidden" name="returnTo" value={`/admin/orders/${encodeURIComponent(order.id)}`} />
              <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                ডেলিভারড করুন
              </button>
            </form>
            <a
              href={deliveredWhatsappHref}
              className="rounded-md bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:bg-[#20BD5A]"
            >
              ডেলিভারি মেসেজ পাঠান
            </a>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <p className="text-sm font-semibold">অ্যাডমিন নোট</p>
          <form action={updateOrderNote} className="mt-2 space-y-2">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="returnTo" value={`/admin/orders/${encodeURIComponent(order.id)}`} />
            <textarea
              name="note"
              defaultValue={order.note}
              placeholder="অর্ডারের জন্য নোট লিখুন"
              className="admin-input h-24"
            />
            <button className="admin-btn-primary">নোট সেভ করুন</button>
          </form>
        </div>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">বিপদজনক অ্যাকশন</p>
          <form action={deleteOrder} className="mt-2">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="returnTo" value="/admin/orders" />
            <ConfirmSubmitButton
              label="অর্ডার ডিলিট"
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
              confirmText="আপনি কি নিশ্চিতভাবে এই অর্ডারটি ডিলিট করতে চান?"
            />
          </form>
        </div>
      </article>
    </section>
  );
}
