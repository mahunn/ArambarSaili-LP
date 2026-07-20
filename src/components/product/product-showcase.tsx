"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { placeOrderAction } from "@/app/order-actions";
import { formatBdLocalDisplay, toBdInternationalDigits } from "@/lib/phone-bd";
import type { ProductData } from "@/lib/product-store";
import { trackPurchase } from "@/components/meta-pixel";
import { getDisplayImageUrl } from "@/lib/image-helper";
import type { OrderItem } from "@/lib/order-store";

function toMoney(amount: number): string {
  const enFormatted = Math.round(amount).toLocaleString("en-US");
  return `৳${toBanglaDigits(enFormatted)}`;
}

function finalPrice(data: ProductData): number {
  if (data.discountType === "flat") return Math.max(0, data.basePrice - data.discountValue);
  if (data.discountType === "percent")
    return Math.max(0, data.basePrice - (data.basePrice * data.discountValue) / 100);
  return data.basePrice;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function toBanglaDigits(n: number | string): string {
  const map: Record<string, string> = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯"
  };
  return String(n)
    .split("")
    .map((d) => map[d] ?? d)
    .join("");
}

export function ProductShowcase({ product }: { product: ProductData }) {
  const companyName = "আড়ম্বর শৈলী";
  const phoneSource = product.whatsappNumber || product.callNumber;
  const contactDigits = useMemo(() => toBdInternationalDigits(phoneSource), [phoneSource]);
  const displayContact = useMemo(() => formatBdLocalDisplay(phoneSource), [phoneSource]);
  
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [deliveryZone, setDeliveryZone] = useState<"inside" | "outside">("outside");

  const [selectedColors, setSelectedColors] = useState<Record<string, boolean>>(() => {
    const firstColor = product.variants[0]?.colorName;
    return firstColor ? { [firstColor]: true } : {};
  });

  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(() => {
    const firstColor = product.variants[0]?.colorName;
    const firstSize = product.variants[0]?.sizes[0];
    return firstColor && firstSize ? { [firstColor]: firstSize } : {};
  });

  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>(() => {
    const firstColor = product.variants[0]?.colorName;
    return firstColor ? { [firstColor]: 1 } : {};
  });

  const currentVariant = product.variants[activeVariantIndex];
  const images = currentVariant?.images ?? [];
  const activeImage = images[imageIndex] ?? "";

  useEffect(() => {
    setImageIndex(0);
  }, [activeVariantIndex]);

  const discountedPrice = useMemo(() => finalPrice(product), [product]);
  const savedAmount = Math.max(0, product.basePrice - discountedPrice);
  const percentOff =
    product.discountType === "percent"
      ? Math.round(product.discountValue)
      : product.discountType === "flat" && product.basePrice > 0
        ? Math.round((product.discountValue / product.basePrice) * 100)
        : 0;

  const discountBadgeBn =
    product.discountType === "percent"
      ? `-${toBanglaDigits(Math.round(product.discountValue))}%`
      : product.discountType === "flat" && savedAmount > 0
        ? `-${toBanglaDigits(percentOff)}%`
        : "";

  const orderItems = useMemo<OrderItem[]>(() => {
    return product.variants
      .filter((v) => selectedColors[v.colorName])
      .map((v) => ({
        color: v.colorName,
        size: selectedSizes[v.colorName] || "",
        quantity: selectedQuantities[v.colorName] || 1
      }));
  }, [product.variants, selectedColors, selectedSizes, selectedQuantities]);

  const totalQuantity = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  const deliveryCharge = deliveryZone === "inside" ? 80 : 150;

  const totalPrice = useMemo(() => {
    if (totalQuantity === 0) return 0;
    return (discountedPrice * totalQuantity) + deliveryCharge;
  }, [discountedPrice, totalQuantity, deliveryCharge]);

  const whatsappLink = useMemo(() => {
    const itemSummaryText = orderItems
      .map((item) => `${item.color} (${item.size}) - ${item.quantity}টি`)
      .join(", ");
    return `https://wa.me/${contactDigits}?text=${encodeURIComponent(
      `অর্ডার করতে চাই: ${product.title} — [ ${itemSummaryText} ]`
    )}`;
  }, [contactDigits, product.title, orderItems]);

  const callLink = `tel:+${contactDigits}`;
  const [orderState, orderAction, orderPending] = useActionState(placeOrderAction, {});

  const handleCardClick = (idx: number) => {
    setActiveVariantIndex(idx);
    const variant = product.variants[idx];
    if (!variant) return;

    setSelectedColors((prev) => {
      const next = { ...prev };
      next[variant.colorName] = true;
      return next;
    });

    if (!selectedSizes[variant.colorName] && variant.sizes.length > 0) {
      setSelectedSizes((prev) => ({ ...prev, [variant.colorName]: variant.sizes[0] }));
    }
  };

  const handleCheckboxToggle = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const variant = product.variants[idx];
    if (!variant) return;

    setSelectedColors((prev) => {
      const next = { ...prev };
      if (next[variant.colorName]) {
        delete next[variant.colorName];
      } else {
        next[variant.colorName] = true;
        if (!selectedSizes[variant.colorName] && variant.sizes.length > 0) {
          setSelectedSizes((sPrev) => ({ ...sPrev, [variant.colorName]: variant.sizes[0] }));
        }
      }
      return next;
    });
    setActiveVariantIndex(idx);
  };

  const handleUpdateItemQty = (colorName: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const currentQty = prev[colorName] || 1;
      const nextQty = currentQty + delta;
      if (nextQty <= 0) {
        setSelectedColors((cPrev) => {
          const nextColors = { ...cPrev };
          delete nextColors[colorName];
          return nextColors;
        });
        return prev;
      }
      return { ...prev, [colorName]: nextQty };
    });
  };

  const handleRemoveItem = (colorName: string) => {
    setSelectedColors((prev) => {
      const next = { ...prev };
      delete next[colorName];
      return next;
    });
  };

  useEffect(() => {
    if (orderState.success) {
      setShowSuccessModal(true);
      if (orderState.purchaseDetails) {
        trackPurchase({
          eventId: orderState.purchaseDetails.eventId,
          value: orderState.purchaseDetails.value,
          currency: orderState.purchaseDetails.currency,
          contentName: orderState.purchaseDetails.contentName,
          numItems: orderState.purchaseDetails.numItems
        });
      }
    }
  }, [orderState]);

  const featureLines = useMemo(() => {
    return product.description
      .split(/[\n.]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [product.description]);

  const reviewCountBn = toBanglaDigits(Math.max(product.reviews.length * 15, 45));
  const displayedReviews = product.reviews.slice(0, 3);

  const goPrevImage = () => {
    if (images.length === 0) return;
    setImageIndex((i) => (i - 1 + images.length) % images.length);
  };
  const goNextImage = () => {
    if (images.length === 0) return;
    setImageIndex((i) => (i + 1) % images.length);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FAF3EE] via-[#F7EBE3] to-[#F2E2D7] text-[#4A121A] overflow-x-hidden w-full max-w-full">
      <div className="w-full max-w-full overflow-x-hidden relative flex flex-col min-h-screen">
      
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#E8D3C3] bg-[#FAF3EE]/95 shadow-xs backdrop-blur-md">
        <div className="container-page flex min-h-14 items-center justify-between gap-2 py-2">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt={companyName}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover shadow-sm ring-2 ring-[#D4A343]/60 shrink-0"
            />
            <p className="font-display text-base sm:text-lg font-bold tracking-tight text-[#4A121A]">{companyName}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={callLink}
              className="hidden items-center gap-1.5 text-xs font-semibold text-[#5C1724] hover:text-[#9E3647] sm:flex bg-white/80 border border-[#E8D3C3] px-3 py-1.5 rounded-full shadow-xs"
            >
              <span>📞</span>
              <span className="tabular-nums">{displayContact}</span>
            </a>
            <a
              href={whatsappLink}
              className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-2.5 sm:px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#20BD5A]"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-white" />
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <section className="container-page pb-24 pt-4 md:pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          
          {/* Gallery */}
          <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
            <div className="glass-card rounded-3xl p-3 shadow-xs border border-[#E8D3C3]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#FDF8F5] border border-[#E8D3C3]/60">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getDisplayImageUrl(activeImage)}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9E7C84]">ছবি নেই</div>
                )}
                {discountBadgeBn ? (
                  <span className="absolute left-3 top-3 rounded-lg bg-[#9E3647] px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                    {discountBadgeBn}
                  </span>
                ) : null}
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-base text-[#4A121A] shadow-xs border border-[#E8D3C3]"
                      aria-label="আগের ছবি"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-base text-[#4A121A] shadow-xs border border-[#E8D3C3]"
                      aria-label="পরের ছবি"
                    >
                      ›
                    </button>
                  </>
                ) : null}
                {images.length > 0 ? (
                  <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[#4A121A]/80 px-2 py-0.5 text-[11px] font-medium text-[#FAF3EE]">
                    {toBanglaDigits(imageIndex + 1)}/{toBanglaDigits(images.length)}
                  </span>
                ) : null}
              </div>

              {/* Thumbnails */}
              {product.variants.length > 0 ? (
                <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                  {product.variants.flatMap((variant, vIdx) =>
                    variant.images.map((img, imgIdx) => {
                      const selected = vIdx === activeVariantIndex && imgIdx === imageIndex;
                      return (
                        <button
                          key={`${vIdx}-${imgIdx}`}
                          type="button"
                          onClick={() => {
                            setActiveVariantIndex(vIdx);
                            setImageIndex(imgIdx);
                          }}
                          className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                            selected ? "border-[#9E3647]" : "border-[#E8D3C3] opacity-80"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getDisplayImageUrl(img)} alt={variant.colorName} className="h-full w-full object-cover" />
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </aside>

          {/* Details & Ordering */}
          <div className="space-y-4">
            
            {/* Overview Card */}
            <div className="glass-card rounded-3xl p-5 shadow-xs border border-[#E8D3C3]">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#4A121A] leading-snug">{product.title}</h1>
              
              <div className="mt-1.5 flex items-center gap-2 text-[#D4A343] text-xs font-semibold">
                <span>★★★★★</span>
                <span className="text-[#7D525C]">৫.০ ({reviewCountBn} রিভিউ)</span>
              </div>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-2.5 border-y border-[#E8D3C3]/60 py-3">
                <p className="text-2xl sm:text-3xl font-bold text-[#9E3647]">{toMoney(discountedPrice)}</p>
                {product.discountType !== "none" ? (
                  <p className="text-base text-[#9E7C84] line-through">{toMoney(product.basePrice)}</p>
                ) : null}
              </div>

              {/* Minimal Features List */}
              {featureLines.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs sm:text-sm text-[#4A121A]">
                  {featureLines.map((line) => (
                    <li key={line} className="flex gap-2 items-center">
                      <span className="text-[#9E3647] font-bold">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Quick Action Button */}
              <a
                href="#color-selector"
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#9E3647] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#8B2C3B] transition"
              >
                অর্ডার করুন
              </a>
            </div>

            {/* Simple Trust Badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "🚚", label: "সারাদেশে ডেলিভারি" },
                { icon: "💵", label: "ক্যাশ অন ডেলিভারি" },
                { icon: "✓", label: "অরিজিনাল কোয়ালিটি" }
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#E8D3C3] bg-white/90 p-2 text-center shadow-xs">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] font-bold text-[#4A121A]">{item.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: Color & Size */}
            <div id="color-selector" className="glass-card rounded-3xl p-5 shadow-xs border border-[#E8D3C3]">
              <p className="text-sm font-bold text-[#4A121A] border-b border-[#E8D3C3]/60 pb-2">১. রঙ ও সাইজ নির্বাচন করুন</p>

              <div className="mt-3 space-y-2.5">
                {product.variants.map((variant, idx) => {
                  const previewImage = variant.images[0];
                  const isChecked = !!selectedColors[variant.colorName];
                  
                  return (
                    <div
                      key={`${variant.colorName}-${idx}`}
                      onClick={() => handleCardClick(idx)}
                      className={`relative flex flex-col rounded-2xl border p-3 cursor-pointer select-none transition ${
                        isChecked 
                          ? "border-[#9E3647] bg-[#FDF2F4]" 
                          : "border-[#E8D3C3] bg-[#FAF4EF] hover:bg-[#F8EEE7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          onClick={(e) => handleCheckboxToggle(idx, e)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                            isChecked ? "border-[#9E3647] bg-[#9E3647] text-white" : "border-[#E8D3C3] bg-white"
                          }`}
                        >
                          {isChecked && <span className="text-xs font-bold">✓</span>}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs sm:text-sm text-[#4A121A]">{variant.colorName}</p>
                          <p className="text-xs font-bold text-[#9E3647]">{toMoney(discountedPrice)}</p>
                        </div>

                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E8D3C3] bg-white">
                          {previewImage ? (
                            <img src={getDisplayImageUrl(previewImage)} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                      </div>

                      {/* Sizes */}
                      {isChecked && (
                        <div className="mt-2.5 border-t border-[#E8D3C3]/60 pt-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1.5">
                            {variant.sizes.map((s) => {
                              const isSizeSelected = selectedSizes[variant.colorName] === s;
                              return (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => setSelectedSizes((prev) => ({ ...prev, [variant.colorName]: s }))}
                                  className={`min-h-9 px-3 text-xs font-bold rounded-lg border transition ${
                                    isSizeSelected
                                      ? "border-[#9E3647] bg-[#9E3647] text-white"
                                      : "border-[#E8D3C3] bg-white text-[#4A121A]"
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Delivery Form */}
            <form
              id="order-form"
              action={orderAction}
              className="glass-card rounded-3xl p-5 shadow-xs border border-[#E8D3C3] space-y-3.5"
            >
              <p className="text-sm font-bold text-[#4A121A] border-b border-[#E8D3C3]/60 pb-2">২. আপনার ডেলিভারি তথ্য</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#4A121A]">আপনার নাম *</label>
                  <input
                    name="customerName"
                    placeholder="পূর্ণ নাম"
                    className="min-h-11 w-full rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] px-3.5 text-xs text-[#2C0E14] outline-none focus:border-[#9E3647] focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#4A121A]">মোবাইল নাম্বার *</label>
                  <input
                    name="customerPhone"
                    placeholder="01XXXXXXXXX"
                    className="min-h-11 w-full rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] px-3.5 text-xs text-[#2C0E14] outline-none focus:border-[#9E3647] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#4A121A]">ঠিকানা *</label>
                <textarea
                  name="customerAddress"
                  placeholder="এলাকা, থানা, জেলা"
                  className="h-20 w-full rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] px-3.5 py-2 text-xs text-[#2C0E14] outline-none focus:border-[#9E3647] focus:bg-white"
                  required
                />
              </div>

              {/* Delivery Zone */}
              <div>
                <p className="mb-1.5 text-xs font-bold text-[#4A121A]">ডেলিভারি এরিয়া *</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] px-3 has-[:checked]:border-[#9E3647] has-[:checked]:bg-[#FDF2F4]">
                    <input 
                      type="radio" 
                      name="deliveryZone" 
                      value="outside" 
                      checked={deliveryZone === "outside"}
                      onChange={() => setDeliveryZone("outside")}
                      className="accent-[#9E3647]" 
                      required 
                    />
                    <span className="text-xs font-semibold text-[#4A121A]">ঢাকার বাইরে (১৫০ টাকা)</span>
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] px-3 has-[:checked]:border-[#9E3647] has-[:checked]:bg-[#FDF2F4]">
                    <input 
                      type="radio" 
                      name="deliveryZone" 
                      value="inside" 
                      checked={deliveryZone === "inside"}
                      onChange={() => setDeliveryZone("inside")}
                      className="accent-[#9E3647]" 
                    />
                    <span className="text-xs font-semibold text-[#4A121A]">ঢাকা সিটি (৮০ টাকা)</span>
                  </label>
                </div>
              </div>

              <input type="hidden" name="items" value={JSON.stringify(orderItems)} />
              <input type="hidden" name="color" value={orderItems[0]?.color || ""} />
              <input type="hidden" name="size" value={orderItems[0]?.size || ""} />
              <input type="hidden" name="quantity" value={totalQuantity} />

              {/* Selected Items */}
              {orderItems.length > 0 ? (
                <div className="rounded-xl border border-[#E8C4CE] bg-[#FDF2F4] p-3 text-xs">
                  <div className="space-y-1.5">
                     {orderItems.map((item, idx) => (
                      <div key={`${item.color}-${item.size}-${idx}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#E8D3C3]">
                        <span className="font-bold text-[#4A121A]">{item.color} ({item.size})</span>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => handleUpdateItemQty(item.color, -1)} className="px-2 py-0.5 rounded bg-[#FAF4EF] font-bold text-xs">-</button>
                          <span className="font-bold">{toBanglaDigits(item.quantity)}</span>
                          <button type="button" onClick={() => handleUpdateItemQty(item.color, 1)} className="px-2 py-0.5 rounded bg-[#FAF4EF] font-bold text-xs">+</button>
                          <button type="button" onClick={() => handleRemoveItem(item.color)} className="ml-1 text-red-500 font-bold">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Summary */}
              <div className="rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>পণ্যের দাম:</span>
                  <span className="font-bold">{toMoney(discountedPrice * totalQuantity)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ডেলিভারি চার্জ:</span>
                  <span className="font-bold">{toMoney(deliveryCharge)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#9E3647] border-t border-[#E8D3C3] pt-1.5">
                  <span>সর্বমোট:</span>
                  <span>{toMoney(totalPrice)}</span>
                </div>
              </div>

              {orderState.error ? <p className="text-xs text-red-600 font-semibold">{orderState.error}</p> : null}

              <button
                type="submit"
                disabled={orderPending || orderItems.length === 0 || orderItems.some(item => !item.size)}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[#9E3647] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#8B2C3B] disabled:opacity-50 transition"
              >
                {orderPending ? "প্রক্রিয়াধীন..." : "কনফার্ম করুন (ক্যাশ অন ডেলিভারি)"}
              </button>
            </form>

          </div>
        </div>
      </section>

      {/* FAQ & Reviews */}
      <div className="w-full border-t border-[#E8D3C3] bg-[#F5E6DC]/60">
        <div className="container-page mx-auto max-w-6xl space-y-6 py-8 pb-24">
          
          {/* FAQ */}
          <section className="w-full rounded-3xl bg-white/90 p-5 shadow-xs border border-[#E8D3C3]">
            <h2 className="text-center text-base font-bold text-[#4A121A]">সাধারণ প্রশ্নাবলী</h2>
            <div className="mx-auto mt-4 w-full max-w-3xl space-y-2">
              {product.faqs.map((item, idx) => (
                <div key={`${item.question}-${idx}`} className="overflow-hidden rounded-xl border border-[#E8D3C3] bg-[#FAF4EF]">
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex((prev) => (prev === idx ? null : idx))}
                    className="flex min-h-10 w-full items-center justify-between px-4 py-2.5 text-xs font-bold text-[#4A121A] text-left"
                  >
                    <span>{item.question}</span>
                    <span>{faqOpenIndex === idx ? "⌃" : "⌄"}</span>
                  </button>
                  {faqOpenIndex === idx ? (
                    <p className="border-t border-[#E8D3C3] px-4 py-2.5 text-xs leading-relaxed text-[#5C1724]">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* Customer Reviews */}
          {displayedReviews.length > 0 ? (
            <section className="w-full rounded-3xl bg-white/90 p-5 shadow-xs border border-[#E8D3C3]">
              <h2 className="text-center text-base font-bold text-[#4A121A]">গ্রাহক মতামত</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {displayedReviews.map((rev, idx) => (
                  <article key={`${rev.author}-${idx}`} className="flex flex-col rounded-xl border border-[#E8D3C3] bg-[#FAF4EF] p-3 text-xs">
                    <p className="text-[#D4A343] font-bold">★★★★★</p>
                    <p className="mt-1 text-xs text-[#5C1724] leading-relaxed flex-1">{rev.text}</p>
                    <p className="mt-2 text-[11px] font-bold text-[#7D525C]">— {rev.author}, {rev.location}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

        </div>
      </div>

      {/* Footer */}
      <footer className="relative w-full border-t border-[#6E2A37] bg-gradient-to-b from-[#3D101A] to-[#1E050B] py-10 pb-20 text-[#FAF3EE] md:pb-10">
        <div className="container-page relative mx-auto text-center flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpeg"
            alt={companyName}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover shadow-lg ring-4 ring-[#D4A343]/60"
          />
          <div>
            <p className="font-display text-xl font-bold text-[#FAF3EE]">{companyName}</p>
            <p className="text-xs text-[#D4A343] mt-0.5">📞 {displayContact}</p>
          </div>
          <p className="text-[11px] text-[#C49FA7]">© {new Date().getFullYear()} সর্বস্বত্ব সংরক্ষিত</p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={whatsappLink}
        className="fixed bottom-16 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md md:bottom-6"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon className="h-6 w-6" />
      </a>

      {/* Mobile Sticky Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D3C3] bg-[#FAF3EE]/95 p-2 backdrop-blur-md md:hidden">
        <div className="flex gap-2 max-w-6xl mx-auto">
          <a
            href="#color-selector"
            className="min-h-10 flex-1 rounded-lg bg-[#9E3647] px-3 py-2 text-center text-xs font-bold text-white shadow-xs flex items-center justify-center"
          >
            অর্ডার করুন
          </a>
          <a
            href={whatsappLink}
            className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-[#25D366] px-3 py-2 text-center text-xs font-bold text-white shadow-xs"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
            WhatsApp
          </a>
        </div>
      </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-xl border border-[#E8C4CE] text-[#4A121A]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FDF2F4] text-xl border border-[#E8C4CE] text-[#9E3647]">
              🎉
            </div>

            <h3 className="mt-2.5 font-display text-lg font-bold text-[#4A121A]">অর্ডারটি সফল হয়েছে!</h3>
            <p className="mt-1 text-xs text-[#7D525C]">
              অর্ডার আইডি: <span className="font-bold text-[#9E3647] select-all">{orderState.success?.replace("Order placed successfully: ", "")}</span>
            </p>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="mt-4 min-h-10 w-full rounded-xl bg-[#9E3647] hover:bg-[#8B2C3B] font-bold text-xs text-white transition"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
