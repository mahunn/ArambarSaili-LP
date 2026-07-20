"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductData } from "@/lib/product-store";

function coerceDiscountType(v: string | undefined): ProductData["discountType"] {
  if (v === "flat" || v === "percent" || v === "none") return v;
  return "none";
}

type ProductBasicsFormProps = {
  product: ProductData;
  action: (formData: FormData) => void | Promise<void>;
};

export function ProductBasicsForm({ product, action }: ProductBasicsFormProps) {
  const [basePrice, setBasePrice] = useState<number>(product.basePrice);
  const [discountValue, setDiscountValue] = useState<number>(product.discountValue);
  const [discountType, setDiscountType] = useState<ProductData["discountType"]>(() =>
    coerceDiscountType(product.discountType)
  );
  const [whatsapp, setWhatsapp] = useState<string>(product.whatsappNumber);
  const [call, setCall] = useState<string>(product.callNumber);

  useEffect(() => {
    setBasePrice(product.basePrice);
    setDiscountValue(product.discountValue);
    setDiscountType(coerceDiscountType(product.discountType));
    setWhatsapp(product.whatsappNumber);
    setCall(product.callNumber);
  }, [
    product.basePrice,
    product.callNumber,
    product.discountType,
    product.discountValue,
    product.whatsappNumber
  ]);

  const finalPrice = useMemo(() => {
    if (discountType === "flat") return Math.max(0, basePrice - discountValue);
    if (discountType === "percent") return Math.max(0, basePrice - (basePrice * discountValue) / 100);
    return basePrice;
  }, [basePrice, discountType, discountValue]);

  const waDigits = whatsapp.replace(/\D/g, "");
  const callDigits = call.replace(/\D/g, "");

  return (
    <form action={action} className="space-y-3">
      <label className="block text-xs font-medium text-slate-600">পণ্যের শিরোনাম</label>
      <input name="title" defaultValue={product.title} placeholder="পণ্যের নাম" className="admin-input" />

      <label className="block text-xs font-medium text-slate-600">পণ্যের বিবরণ</label>
      <textarea name="description" defaultValue={product.description} placeholder="বিবরণ" className="admin-input h-24" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">মূল দাম (৳)</label>
          <input
            name="basePrice"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value || 0)))}
            placeholder="মূল দাম"
            className="admin-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">ডিসকাউন্ট ভ্যালু</label>
          <input
            name="discountValue"
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value || 0)))}
            placeholder="ডিসকাউন্ট"
            className="admin-input"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">ডিসকাউন্ট টাইপ</label>
        {/* Hidden field: server action always receives the React state value (controlled <select> can omit from FormData). */}
        <input type="hidden" name="discountType" value={discountType} />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(coerceDiscountType(e.target.value))}
          className="admin-input"
          aria-label="ডিসকাউন্ট টাইপ"
        >
          <option value="none">ডিসকাউন্ট নেই</option>
          <option value="flat">টাকা ডিসকাউন্ট (যেমন 100)</option>
          <option value="percent">শতাংশ ডিসকাউন্ট (যেমন 10%)</option>
        </select>
        <p className="mt-1 text-[11px] text-slate-500">
          টাকা ডিসকাউন্ট হলে ভ্যালু সরাসরি টাকা হিসেবে কাটা হবে, শতাংশ হলে % হিসেবে কাটা হবে।
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">হোয়াটসঅ্যাপ নম্বর</label>
          <input
            name="whatsappNumber"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="হোয়াটসঅ্যাপ নম্বর"
            className="admin-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">কল নম্বর</label>
          <input
            name="callNumber"
            value={call}
            onChange={(e) => setCall(e.target.value)}
            placeholder="কল নম্বর"
            className="admin-input"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">বর্তমান বিক্রয় মূল্য: ৳{Math.round(finalPrice)}</p>

      <div className="flex flex-wrap gap-2">
        <a
          href={waDigits.length >= 8 ? `https://wa.me/${waDigits}` : "#"}
          className={`min-h-12 rounded-2xl px-4 py-3 text-xs font-semibold text-white ${waDigits.length >= 8 ? "bg-green-500" : "bg-slate-400 pointer-events-none"}`}
        >
          WhatsApp টেস্ট
        </a>
        <a
          href={callDigits.length >= 8 ? `tel:${callDigits}` : "#"}
          className={`min-h-12 rounded-2xl px-4 py-3 text-xs font-semibold text-white ${callDigits.length >= 8 ? "bg-slate-900" : "bg-slate-400 pointer-events-none"}`}
        >
          Call টেস্ট
        </a>
      </div>

      <button className="admin-btn-primary">সেভ করুন</button>
    </form>
  );
}
