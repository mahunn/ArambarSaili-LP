import { redirect } from "next/navigation";
import {
  addVariant,
  moveVariantImage,
  removeVariant,
  removeVariantImage,
  updateProductBasics,
  updateVariantData
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { ProductBasicsForm } from "@/components/admin/product-basics-form";
import { isAuthenticated } from "@/lib/auth";
import { readProductData } from "@/lib/product-store";
import { getDisplayImageUrl } from "@/lib/image-helper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminProductPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");
  const product = await readProductData();

  return (
    <section className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">পণ্য সেটিংস (Product Settings)</h2>
          <p className="text-sm text-slate-500 mt-1">এখানে পণ্যের মূল্য, বিবরণ, রঙ, সাইজ ও ছবি পরিবর্তন করতে পারবেন।</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 self-start md:self-auto border border-emerald-100/50 shadow-sm">
          ✨ এই পেজে করা পরিবর্তন সাথে সাথে ল্যান্ডিং পেজে দেখাবে।
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] items-start">
        {/* Left Panel: Basic Details */}
        <section className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="text-xl">⚙️</span>
            <h3 className="text-lg font-bold text-slate-800">পণ্যের সাধারণ তথ্য</h3>
          </div>
          <ProductBasicsForm product={product} action={updateProductBasics} />
        </section>

        {/* Right Panel: Colors & Sizes */}
        <section className="space-y-5">
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h3 className="text-lg font-bold text-slate-800">কালার ও সাইজ ভ্যারিয়েন্ট</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                মোট কালার: {product.variants.length}টি
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                <span>💡</span> কিভাবে কাজ করবেন:
              </p>
              <p>১. নিচে যে ভ্যারিয়েন্ট পরিবর্তন করতে চান তার প্যানেলটি খুলুন।</p>
              <p>২. রঙের নাম, সাইজ পরিবর্তন করুন এবং লাগলে কম্পিউটার থেকে নতুন ছবি সিলেক্ট করুন।</p>
              <p>৩. **"ভ্যারিয়েন্ট আপডেট করুন"** বাটনে চাপ দিয়ে একসাথে সবকিছু সেভ করুন (পৃথকভাবে আপলোড করতে হবে না)।</p>
              <p>৪. ভ্যারিয়েন্টের **প্রথম ছবি** সেটিই কাস্টমার ল্যান্ডিং পেজে কভার ছবি হিসেবে দেখতে পাবে।</p>
            </div>

            <div className="space-y-4 mt-4">
              {product.variants.map((variant, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Variant Accordion Header */}
                  <div className="bg-slate-50/50 px-4 py-3.5 flex items-center justify-between border-b border-slate-200/60">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        ভ্যারিয়েন্ট #{idx + 1}: {variant.colorName || "নামহীন"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        সাইজ: {variant.sizes.join(", ") || "নেই"} | ছবি: {variant.images.length}টি
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={removeVariant}>
                        <input type="hidden" name="variantIndex" value={idx} />
                        <ConfirmSubmitButton
                          label="মুছুন"
                          pendingLabel="মুছা হচ্ছে..."
                          className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition"
                          confirmText="এই কালার ভ্যারিয়েন্ট এবং এর সব ছবি মুছে ফেলতে চান?"
                        />
                      </form>
                    </div>
                  </div>

                  {/* Variant Body */}
                  <div className="p-4 space-y-4">
                    {/* Unified Form (Text Fields + Optional File Upload) */}
                    <form action={updateVariantData} className="space-y-3" encType="multipart/form-data">
                      <input type="hidden" name="variantIndex" value={idx} />
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">রঙের নাম</label>
                          <input
                            name="colorName"
                            defaultValue={variant.colorName}
                            placeholder="যেমন: Navy Blue, Maroon"
                            className="admin-input"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">সাইজ তালিকা (প্রতি লাইনে ১টি)</label>
                          <textarea
                            name="sizes"
                            defaultValue={variant.sizes.join("\n")}
                            placeholder="যেমন:&#10;M&#10;L&#10;XL"
                            className="admin-input h-[42px] min-h-[42px] max-h-32 resize-y py-2.5"
                          />
                        </div>
                      </div>

                      {/* Image Upload Area inside same form */}
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3.5">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">নতুন ছবি যুক্ত করুন</label>
                        <input
                          name="imageFile"
                          type="file"
                          accept="image/*"
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">পণ্যটির কোনো নতুন ছবি যোগ করতে চাইলে এখান থেকে ফাইল সিলেক্ট করুন।</p>
                      </div>

                      <AdminSubmitButton
                        label="ভ্যারিয়েন্ট আপডেট করুন (সেভ)"
                        pendingLabel="আপডেট করা হচ্ছে..."
                        className="w-full min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition duration-200"
                      />
                    </form>

                    {/* Manage uploaded images */}
                    {variant.images.length > 0 ? (
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                          <span>🖼️</span> ছবির তালিকা ও ক্রম:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {variant.images.map((img, imageIndex) => (
                            <div
                              key={`${img}-${imageIndex}`}
                              className="group relative rounded-2xl border border-slate-200 bg-white p-2 flex flex-col shadow-sm"
                            >
                              {/* Image Preview using proxy */}
                              <div className="aspect-[4/5] overflow-hidden rounded-xl bg-slate-100 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={getDisplayImageUrl(img)}
                                  alt={variant.colorName}
                                  className="h-full w-full object-cover"
                                />
                                {imageIndex === 0 ? (
                                  <span className="absolute top-2 left-2 rounded-lg bg-teal-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                                    কভার ছবি
                                  </span>
                                ) : null}
                              </div>

                              {/* Controls */}
                              <div className="mt-2 flex items-center justify-between gap-1">
                                <div className="flex gap-0.5">
                                  <form action={moveVariantImage}>
                                    <input type="hidden" name="variantIndex" value={idx} />
                                    <input type="hidden" name="imageIndex" value={imageIndex} />
                                    <input type="hidden" name="direction" value="up" />
                                    <button
                                      disabled={imageIndex === 0}
                                      title="আগে নিন"
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition text-xs"
                                    >
                                      ◀
                                    </button>
                                  </form>
                                  <form action={moveVariantImage}>
                                    <input type="hidden" name="variantIndex" value={idx} />
                                    <input type="hidden" name="imageIndex" value={imageIndex} />
                                    <input type="hidden" name="direction" value="down" />
                                    <button
                                      disabled={imageIndex === variant.images.length - 1}
                                      title="পরে নিন"
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition text-xs"
                                    >
                                      ▶
                                    </button>
                                  </form>
                                </div>

                                <form action={removeVariantImage}>
                                  <input type="hidden" name="variantIndex" value={idx} />
                                  <input type="hidden" name="imageIndex" value={imageIndex} />
                                  <button
                                    title="ছবি মুছুন"
                                    className="flex h-7 px-2 items-center justify-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 transition"
                                  >
                                    মুছুন
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/20 p-5 text-center text-xs text-slate-400">
                        এখনো কোনো ছবি আপলোড করা হয়নি।
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add new variant */}
            <form action={addVariant} className="pt-2">
              <AdminSubmitButton
                label="➕ নতুন কালার ভ্যারিয়েন্ট যোগ করুন"
                pendingLabel="যোগ করা হচ্ছে..."
                className="w-full min-h-12 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 text-emerald-700 font-bold text-sm transition duration-200 flex items-center justify-center gap-1.5"
              />
            </form>
          </div>
        </section>
      </div>
    </section>
  );
}
