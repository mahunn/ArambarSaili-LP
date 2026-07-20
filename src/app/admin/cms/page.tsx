import { redirect } from "next/navigation";
import { addFaq, removeFaq, updateFaq } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { isAuthenticated } from "@/lib/auth";
import { readProductData } from "@/lib/product-store";

export default async function AdminCmsPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const product = await readProductData();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">CMS / FAQ</h2>
          <p className="text-sm text-slate-500">প্রোডাক্ট পেজের FAQ সেকশন এখান থেকে ম্যানেজ করুন।</p>
        </div>
        <form action={addFaq}>
          <button className="admin-btn-primary">+ নতুন FAQ</button>
        </form>
      </div>

      <div className="space-y-3">
        {product.faqs.map((faq, idx) => (
          <article key={idx} className="admin-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">FAQ #{idx + 1}</p>
              <form action={removeFaq}>
                <input type="hidden" name="faqIndex" value={idx} />
                <ConfirmSubmitButton
                  label="মুছুন"
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
                  confirmText="এই FAQ মুছে ফেলতে চান?"
                />
              </form>
            </div>
            <form action={updateFaq} className="space-y-2">
              <input type="hidden" name="faqIndex" value={idx} />
              <input name="question" defaultValue={faq.question} placeholder="প্রশ্ন" className="admin-input" />
              <textarea name="answer" defaultValue={faq.answer} placeholder="উত্তর" className="admin-input h-24" />
              <button className="admin-btn-dark">সেভ FAQ</button>
            </form>
          </article>
        ))}
        {product.faqs.length === 0 ? (
          <div className="admin-card">
            <p className="text-sm text-slate-500">এখনও কোনো FAQ যোগ করা হয়নি।</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
