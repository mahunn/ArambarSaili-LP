"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductData } from "@/lib/product-store";
import { saveCompleteProductAction } from "@/app/admin/actions";
import { getDisplayImageUrl } from "@/lib/image-helper";

type NewFileItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type EditableVariant = {
  id: string;
  colorName: string;
  sizes: string[];
  existingImages: string[];
  newFiles: NewFileItem[];
};

export function UnifiedProductEditor({
  initialProduct
}: {
  initialProduct: ProductData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  // Basic Details State
  const [title, setTitle] = useState(initialProduct.title);
  const [description, setDescription] = useState(initialProduct.description);
  const [basePrice, setBasePrice] = useState(initialProduct.basePrice);
  const [discountType, setDiscountType] = useState<"none" | "flat" | "percent">(
    initialProduct.discountType || "none"
  );
  const [discountValue, setDiscountValue] = useState(initialProduct.discountValue || 0);
  const [whatsappNumber, setWhatsappNumber] = useState(initialProduct.whatsappNumber || "");
  const [callNumber, setCallNumber] = useState(initialProduct.callNumber || "");

  // Variants State
  const [variants, setVariants] = useState<EditableVariant[]>(() => {
    return (initialProduct.variants || []).map((v, idx) => ({
      id: `var-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      colorName: v.colorName,
      sizes: v.sizes || ["M", "L", "XL"],
      existingImages: [...(v.images || [])],
      newFiles: []
    }));
  });

  // Calculate live final price
  const computedFinalPrice = () => {
    if (discountType === "flat") return Math.max(0, basePrice - discountValue);
    if (discountType === "percent") return Math.max(0, basePrice - (basePrice * discountValue) / 100);
    return basePrice;
  };

  // Add new variant instantly
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        colorName: `Color ${prev.length + 1}`,
        sizes: ["M", "L", "XL"],
        existingImages: [],
        newFiles: []
      }
    ]);
  };

  // Duplicate variant
  const handleDuplicateVariant = (idx: number) => {
    const source = variants[idx];
    if (!source) return;
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        colorName: `${source.colorName} (Copy)`,
        sizes: [...source.sizes],
        existingImages: [...source.existingImages],
        newFiles: []
      }
    ]);
  };

  // Delete variant instantly
  const handleDeleteVariant = (idx: number) => {
    if (variants.length <= 1) {
      alert("কমপক্ষে ১টি কালার ভ্যারিয়েন্ট থাকতে হবে।");
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update variant color name
  const handleColorNameChange = (idx: number, name: string) => {
    setVariants((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx].colorName = name;
      return next;
    });
  };

  // Update variant sizes
  const handleSizesChange = (idx: number, raw: string) => {
    const parsed = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setVariants((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx].sizes = parsed;
      return next;
    });
  };

  // Select new files for variant
  const handleFilesSelect = (idx: number, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const addedFiles: NewFileItem[] = Array.from(fileList).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setVariants((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx].newFiles = [...next[idx].newFiles, ...addedFiles];
      }
      return next;
    });
  };

  // Delete existing image instantly
  const handleDeleteExistingImage = (vIdx: number, imgIdx: number) => {
    setVariants((prev) => {
      const next = [...prev];
      if (next[vIdx]) {
        next[vIdx].existingImages = next[vIdx].existingImages.filter((_, i) => i !== imgIdx);
      }
      return next;
    });
  };

  // Delete newly added file instantly
  const handleDeleteNewFile = (vIdx: number, fIdx: number) => {
    setVariants((prev) => {
      const next = [...prev];
      if (next[vIdx]) {
        const item = next[vIdx].newFiles[fIdx];
        if (item) URL.revokeObjectURL(item.previewUrl);
        next[vIdx].newFiles = next[vIdx].newFiles.filter((_, i) => i !== fIdx);
      }
      return next;
    });
  };

  // Move existing image
  const handleMoveExistingImage = (vIdx: number, imgIdx: number, dir: "left" | "right") => {
    setVariants((prev) => {
      const next = [...prev];
      const targetList = [...next[vIdx].existingImages];
      const targetIdx = dir === "left" ? imgIdx - 1 : imgIdx + 1;
      if (targetIdx < 0 || targetIdx >= targetList.length) return prev;

      const temp = targetList[targetIdx];
      targetList[targetIdx] = targetList[imgIdx];
      targetList[imgIdx] = temp;

      next[vIdx].existingImages = targetList;
      return next;
    });
  };

  // Master Save Handler
  const handleMasterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (variants.length === 0) {
      alert("কমপক্ষে ১টি কালার ভ্যারিয়েন্ট যুক্ত করুন।");
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("title", title);
        fd.append("description", description);
        fd.append("basePrice", String(basePrice));
        fd.append("discountType", discountType);
        fd.append("discountValue", String(discountValue));
        fd.append("whatsappNumber", whatsappNumber);
        fd.append("callNumber", callNumber);

        // Package variant metadata
        const variantPayload = variants.map((v) => ({
          id: v.id,
          colorName: v.colorName,
          sizes: v.sizes,
          existingImages: v.existingImages
        }));
        fd.append("variantsJson", JSON.stringify(variantPayload));

        // Append all new files under `files_<variantId>`
        variants.forEach((v) => {
          v.newFiles.forEach((nf) => {
            fd.append(`files_${v.id}`, nf.file);
          });
        });

        const res = await saveCompleteProductAction(fd);
        if (res.success) {
          setFeedback({ type: "ok", msg: res.message || "পণ্য সফলভাবে সেভ হয়েছে!" });
          if (res.updatedProduct?.variants) {
            setVariants(
              res.updatedProduct.variants.map((v, idx) => ({
                id: `var-${Date.now()}-${idx}`,
                colorName: v.colorName,
                sizes: v.sizes,
                existingImages: v.images,
                newFiles: []
              }))
            );
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
          router.refresh();
        } else {
          setFeedback({ type: "error", msg: res.error || "সেভ করতে সমস্যা হয়েছে।" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err: any) {
        console.error("Save error:", err);
        setFeedback({ type: "error", msg: err?.message || "একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <form onSubmit={handleMasterSubmit} className="space-y-6">
      {/* Live Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm font-bold border flex items-center justify-between shadow-xs transition-all ${
            feedback.type === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{feedback.type === "error" ? "⚠️" : "✅"}</span>
            <span>{feedback.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sticky Top Control Bar with Save Button */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md border-y border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs sm:text-sm font-bold text-slate-800">
            মোট কালার: <span className="text-emerald-700 font-extrabold">{variants.length}টি</span>
          </p>
          <span className="text-slate-300">|</span>
          <p className="text-xs text-slate-500">
            বিক্রয় মূল্য: <span className="font-bold text-slate-800">৳{Math.round(computedFinalPrice())}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddVariant}
            className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition"
          >
            ➕ নতুন কালার যোগ করুন
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition duration-200"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>সেভ করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>সকল পরিবর্তন একবারে সেভ করুন</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] items-start">
        {/* Left Column: Product Basics */}
        <section className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 space-y-4 lg:sticky lg:top-32">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="text-xl">⚙️</span>
            <h3 className="text-lg font-bold text-slate-800">১. পণ্যের সাধারণ তথ্য</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পণ্যের শিরোনাম (Title)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="পণ্যের নাম"
                className="admin-input"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পণ্যের বিবরণ (Description)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="বিবরণ"
                className="admin-input h-24 resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">মূল দাম (৳)</label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value || 0)))}
                  placeholder="মূল দাম"
                  className="admin-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">ডিসকাউন্ট ভ্যালু</label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value || 0)))}
                  placeholder="ডিসকাউন্ট"
                  className="admin-input"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">ডিসকাউন্ট টাইপ</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "none" | "flat" | "percent")}
                className="admin-input"
              >
                <option value="none">ডিসকাউন্ট নেই</option>
                <option value="flat">টাকা ডিসকাউন্ট (যেমন: 100 ৳)</option>
                <option value="percent">শতাংশ ডিসকাউন্ট (যেমন: 10%)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                বর্তমান বিক্রয় মূল্য: <span className="font-bold text-emerald-700">৳{Math.round(computedFinalPrice())}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">হোয়াটসঅ্যাপ নম্বর</label>
                <input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="admin-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">কল নম্বর</label>
                <input
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="admin-input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Multiple Color Variants & Instant Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🎨</span> ২. কালার ভ্যারিয়েন্ট ও ছবিসমূহ ({variants.length}টি)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                এখান থেকে যেকোনো কালার যোগ, পরিবর্তন বা ডিলিট করুন। সবশেষে সেভ বাটনে চাপুন।
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddVariant}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs transition"
            >
              <span>➕</span>
              <span>কালার যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((variant, vIdx) => {
              const allImagesCount = variant.existingImages.length + variant.newFiles.length;
              const firstCover = variant.existingImages[0] || variant.newFiles[0]?.previewUrl;

              return (
                <div
                  key={variant.id}
                  className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition duration-200"
                >
                  {/* Variant Header */}
                  <div className="bg-slate-50/80 px-5 py-3.5 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {firstCover ? (
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getDisplayImageUrl(firstCover)}
                            alt={variant.colorName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xs font-bold text-slate-400">
                          ছবি নেই
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          কালার #{vIdx + 1}: <span className="text-emerald-700">{variant.colorName || "নাম দিন"}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          সাইজ: {variant.sizes.join(", ") || "নেই"} | মোট ছবি: {allImagesCount}টি
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateVariant(vIdx)}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition"
                        title="এই ভ্যারিয়েন্ট ডুপ্লিকেট করুন"
                      >
                        📋 কপি
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(vIdx)}
                        className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700 shadow-xs transition"
                        title="এই কালার মুছে ফেলুন"
                      >
                        🗑️ মুছুন
                      </button>
                    </div>
                  </div>

                  {/* Variant Body */}
                  <div className="p-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          রঙের নাম <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={variant.colorName}
                          onChange={(e) => handleColorNameChange(vIdx, e.target.value)}
                          placeholder="যেমন: Olive Green, Maroon, Navy Blue"
                          className="admin-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          সাইজ তালিকা (কমা বা নতুন লাইন দিয়ে)
                        </label>
                        <input
                          value={variant.sizes.join(", ")}
                          onChange={(e) => handleSizesChange(vIdx, e.target.value)}
                          placeholder="যেমন: M, L, XL, XXL"
                          className="admin-input"
                        />
                      </div>
                    </div>

                    {/* Image Upload Dropzone */}
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">
                            📸 ছবি যুক্ত করুন (একসাথে একাধিক ছবি সিলেক্ট করা যাবে)
                          </label>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            প্রথম ছবিটি ল্যান্ডিং পেজে স্বয়ংক্রিয়ভাবে কভার হিসেবে প্রদর্শিত হবে।
                          </p>
                        </div>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition shrink-0">
                          <span>➕ ছবি সিলেক্ট করুন</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFilesSelect(vIdx, e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Unified Gallery (Existing Images + Newly Selected File Previews) */}
                      {allImagesCount > 0 ? (
                        <div className="mt-4 border-t border-slate-200/80 pt-3">
                          <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                            <span>🖼️</span> ছবির তালিকা ও ক্রম:
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {/* Existing Images */}
                            {variant.existingImages.map((img, imgIdx) => (
                              <div
                                key={`exist-${img}-${imgIdx}`}
                                className="group relative rounded-2xl border border-slate-200 bg-white p-1.5 flex flex-col shadow-xs"
                              >
                                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-slate-100 relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={getDisplayImageUrl(img)}
                                    alt={variant.colorName}
                                    className="h-full w-full object-cover"
                                  />
                                  {imgIdx === 0 ? (
                                    <span className="absolute top-1.5 left-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                      ⭐ কভার
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-1.5 flex items-center justify-between gap-1">
                                  <div className="flex gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveExistingImage(vIdx, imgIdx, "left")}
                                      disabled={imgIdx === 0}
                                      className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 text-xs font-bold"
                                      title="বামে সরান"
                                    >
                                      ◀
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveExistingImage(vIdx, imgIdx, "right")}
                                      disabled={imgIdx === variant.existingImages.length - 1}
                                      className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 text-xs font-bold"
                                      title="ডানে সরান"
                                    >
                                      ▶
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExistingImage(vIdx, imgIdx)}
                                    className="flex h-6 px-2 items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold"
                                    title="মুছুন"
                                  >
                                    🗑️ মুছুন
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Newly Selected Local Files */}
                            {variant.newFiles.map((nf, fIdx) => (
                              <div
                                key={nf.id}
                                className="group relative rounded-2xl border-2 border-emerald-400 bg-emerald-50/30 p-1.5 flex flex-col shadow-xs"
                              >
                                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-slate-100 relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={nf.previewUrl}
                                    alt="New upload"
                                    className="h-full w-full object-cover"
                                  />
                                  <span className="absolute top-1.5 left-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                    নতুন যোগ করা
                                  </span>
                                </div>

                                <div className="mt-1.5 flex items-center justify-between gap-1">
                                  <span className="text-[10px] text-emerald-800 font-semibold truncate">
                                    {nf.file.name}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNewFile(vIdx, fIdx)}
                                    className="flex h-6 px-2 items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold"
                                    title="বাতিল করুন"
                                  >
                                    ✕ বাদ
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400">
                          এখনো কোনো ছবি যোগ করা হয়নি। উপরে "ছবি সিলেক্ট করুন" বাটনে চাপ দিয়ে ছবি যোগ করুন।
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Big Save Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full min-h-14 rounded-3xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition duration-200 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>সকল তথ্য ও ছবি সেভ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>সকল পণ্যের তথ্য ও কালার ভ্যারিয়েন্ট এক ক্লিকে সেভ করুন</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
