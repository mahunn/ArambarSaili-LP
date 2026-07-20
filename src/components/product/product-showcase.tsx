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
  // Track active variant index for image gallery viewing
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Delivery zone state (binds to order summary in real-time)
  const [deliveryZone, setDeliveryZone] = useState<"inside" | "outside">("outside");

  // Multiple items selection states
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

  // Sync active variant gallery image when variant index changes
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
      ? `-${toBanglaDigits(Math.round(product.discountValue))}% ছাড়`
      : product.discountType === "flat" && savedAmount > 0
        ? `-${toBanglaDigits(percentOff)}% ছাড়`
        : "";

  // Compute ordered items dynamically from selection states
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

    // Auto-select first size if none selected yet for this color
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
        // Auto-select first size if none selected yet for this color
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
        // Uncheck color if quantity goes to 0
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
      .slice(0, 6);
  }, [product.description]);

  const reviewCountBn = toBanglaDigits(Math.max(product.reviews.length * 15, 45));
  const displayedReviews = product.reviews.slice(0, 3);
  const reviewCardTones = ["bg-[#FAF4EF]", "bg-[#F8EEE7]", "bg-[#FDF2F4]"] as const;

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
      <header className="sticky top-0 z-30 border-b border-[#E8D3C3] bg-gradient-to-b from-[#FAF3EE] to-[#F5E6DC]/95 shadow-[0_2px_15px_rgba(74,18,26,0.04)] backdrop-blur-md">
        <div className="container-page flex min-h-12 sm:min-h-14 items-center justify-between gap-1.5 sm:gap-3 py-1.5 sm:py-2.5">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt={companyName}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover shadow-md ring-2 ring-[#D4A343]/60 ring-offset-2 ring-offset-[#FAF3EE]"
            />
            <p className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-[#4A121A]">{companyName}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={callLink}
              className="hidden items-center gap-1.5 text-sm font-semibold text-[#5C1724] transition hover:text-[#9E3647] sm:flex"
            >
              <span aria-hidden>📞</span>
              <span className="tabular-nums">{displayContact}</span>
            </a>
            <a
              href={whatsappLink}
              className="inline-flex min-h-9 sm:min-h-11 items-center gap-1.5 sm:gap-2 rounded-full bg-[#25D366] px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-black/10 transition hover:bg-[#20BD5A] hover:shadow-lg"
            >
              <WhatsAppIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-white" />
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      <section className="container-page pb-32 pt-6 md:pb-28 md:pt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          {/* Left: sticky gallery */}
          <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
            <div className="overflow-hidden rounded-3xl bg-white/95 p-3 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:p-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#FDF8F5] border border-[#E8D3C3]/60">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getDisplayImageUrl(activeImage)}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9E7C84]">কোনো ছবি নেই</div>
                )}
                {discountBadgeBn ? (
                  <span className="absolute left-3 top-3 rounded-lg bg-gradient-to-r from-[#C85A32] to-[#B44622] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                    {discountBadgeBn}
                  </span>
                ) : null}
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-lg text-[#4A121A] shadow-md border border-[#E8D3C3] hover:bg-white transition"
                      aria-label="আগের ছবি"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-lg text-[#4A121A] shadow-md border border-[#E8D3C3] hover:bg-white transition"
                      aria-label="পরের ছবি"
                    >
                      ›
                    </button>
                  </>
                ) : null}
                {images.length > 0 ? (
                  <span className="absolute bottom-3 right-3 rounded-full bg-[#4A121A]/80 px-2.5 py-1 text-xs font-medium text-[#FAF3EE]">
                    {toBanglaDigits(imageIndex + 1)}/{toBanglaDigits(images.length)}
                  </span>
                ) : null}
              </div>

              {product.variants.length > 0 ? (
                <div className="relative mt-3 w-full overflow-hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
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
                            className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                              selected ? "border-[#9E3647] shadow-md ring-2 ring-[#9E3647]/20" : "border-[#E8D3C3] opacity-85 hover:opacity-100"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getDisplayImageUrl(img)} alt={variant.colorName} className="h-full w-full object-cover" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          {/* Right: details + selection + form */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/95 p-5 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:p-6">
              <p className="text-sm font-semibold text-[#9E3647]">{companyName}</p>
              <h1 className="font-display mt-1 text-2xl font-bold leading-tight text-[#4A121A] md:text-3xl">{product.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[#D4A343]">
                <span className="text-base tracking-tight">★★★★★</span>
                <span className="text-sm text-[#7D525C]">({reviewCountBn} রিভিউ)</span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                {product.discountType !== "none" ? (
                  <p className="text-lg text-[#9E7C84] line-through">{toMoney(product.basePrice)}</p>
                ) : null}
                <p className="text-3xl font-bold text-[#9E3647] md:text-4xl">{toMoney(discountedPrice)}</p>
                {product.discountType === "percent" ? (
                  <span className="rounded-md bg-[#9E3647] px-2 py-0.5 text-xs font-bold text-white">-{toBanglaDigits(Math.round(product.discountValue))}% ছাড়</span>
                ) : savedAmount > 0 ? (
                  <span className="rounded-md bg-[#9E3647] px-2 py-0.5 text-xs font-bold text-white">ছাড়</span>
                ) : null}
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E8C4CE] bg-[#FDF0F2] px-3 py-1.5 text-sm font-medium text-[#9E3647]">
                <span>✓</span>
                <span>স্টকে আছে</span>
              </div>

              {featureLines.length > 0 ? (
                <ul className="mt-5 space-y-2 border-t border-[#E8D3C3] pt-5">
                  {featureLines.map((line) => (
                    <li key={line} className="flex gap-2 text-sm text-[#4A121A]">
                      <span className="shrink-0 text-[#9E3647]" aria-hidden>
                        👗
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <a
                href="#color-selector"
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B04D5F] via-[#9E3647] to-[#7E2535] px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-[#9E3647]/25 transition hover:from-[#C85D70] hover:to-[#9E3647]"
              >
                <span aria-hidden>🛒</span>
                অর্ডার করুন
              </a>

              <div className="mt-4 flex justify-center">
                <a
                  href={callLink}
                  aria-label={`কল করুন ${displayContact}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D4A343] to-[#B88222] px-3.5 py-2 pl-3 text-sm font-semibold text-white shadow-md shadow-[#D4A343]/20 transition hover:from-[#E2B755] hover:to-[#C4922A]"
                >
                  <svg className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 10.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                    />
                  </svg>
                  <span className="tabular-nums leading-none">{displayContact}</span>
                </a>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: "🚚", label: "সারাদেশে ডেলিভারি" },
                { icon: "💵", label: "ক্যাশ অন ডেলিভারি" },
                { icon: "✓", label: "১০০% অরিজিনাল" }
              ].map((item) => (
                <div 
                  key={item.label} 
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#E8D3C3] bg-white/90 p-1.5 sm:p-2.5 text-center shadow-[0_4px_16px_rgba(74,18,26,0.04)] transition duration-200 hover:shadow-[0_6px_20px_rgba(74,18,26,0.08)]"
                >
                  <span className="text-xl md:text-2xl" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="text-[9px] font-bold leading-tight text-[#4A121A] sm:text-xs break-words">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Color / size Selector */}
            <div id="color-selector" className="rounded-3xl bg-white/95 p-5 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:p-6">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  🎨
                </span>
                <div>
                  <p className="text-base font-bold text-[#4A121A]">রঙ ও সাইজ সিলেক্ট করুন</p>
                  <p className="text-xs text-[#7D525C]">একাধিক রঙ সিলেক্ট করতে পারবেন</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {product.variants.map((variant, idx) => {
                  const previewImage = variant.images[0];
                  const isChecked = !!selectedColors[variant.colorName];
                  
                  return (
                    <div
                      key={`${variant.colorName}-${idx}`}
                      onClick={() => handleCardClick(idx)}
                      className={`relative flex flex-col rounded-2xl border p-3.5 transition-all cursor-pointer select-none ${
                        isChecked 
                          ? "border-[#9E3647] bg-[#FDF2F4] ring-2 ring-[#9E3647]/20" 
                          : "border-[#E8D3C3] bg-[#FAF4EF] hover:border-[#C88A96] hover:bg-[#F8EEE7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div
                          onClick={(e) => handleCheckboxToggle(idx, e)}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                            isChecked
                              ? "border-[#9E3647] bg-[#9E3647] text-white shadow-sm"
                              : "border-[#E8D3C3] bg-[#FAF4EF]"
                          }`}
                        >
                          {isChecked && (
                            <svg className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Variant Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#4A121A] text-[15px] sm:text-base leading-snug">{variant.colorName}</p>
                          <p className="text-xs sm:text-sm mt-0.5">
                            {product.discountType !== "none" ? (
                              <>
                                <span className="line-through text-[#9E7C84] mr-2">{toMoney(product.basePrice)}</span>{" "}
                                <span className="font-bold text-[#9E3647]">{toMoney(discountedPrice)}</span>
                              </>
                            ) : (
                              <span className="font-bold text-[#9E3647]">{toMoney(discountedPrice)}</span>
                            )}
                          </p>
                        </div>

                        {/* Variant Preview Image */}
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E8D3C3] bg-white shadow-sm">
                          {previewImage ? (
                            <img src={getDisplayImageUrl(previewImage)} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                      </div>

                      {/* Sizes Section inside the Card */}
                      {isChecked && (
                        <div 
                          className="mt-4 border-t border-[#E8D3C3] pt-3" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-bold text-[#4A121A]">সাইজ:</p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {variant.sizes.map((s) => {
                              const isSizeSelected = selectedSizes[variant.colorName] === s;
                              return (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => {
                                    setSelectedSizes((prev) => ({ ...prev, [variant.colorName]: s }));
                                  }}
                                  className={`min-h-11 min-w-[2.75rem] rounded-xl border px-3.5 py-1.5 text-sm font-bold shadow-sm transition active:scale-95 ${
                                    isSizeSelected
                                      ? "border-[#9E3647] bg-[#9E3647] text-white shadow-md shadow-[#9E3647]/20"
                                      : "border-[#E8D3C3] bg-[#FAF4EF] text-[#4A121A] hover:bg-[#F3E7DE]"
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

            <form
              id="order-form"
              action={orderAction}
              className="space-y-4 rounded-3xl bg-white/95 p-5 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:p-6"
            >
              <div className="flex items-center gap-2 border-b border-[#E8D3C3] pb-3">
                <span aria-hidden>📦</span>
                <p className="text-lg font-bold text-[#4A121A]">অর্ডার করুন</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#4A121A]">
                    আপনার নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="customerName"
                    placeholder="আপনার পূর্ণ নাম"
                    className="min-h-12 w-full rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 text-sm text-[#2C0E14] outline-none placeholder:text-[#9E8289] focus:border-[#9E3647] focus:bg-white focus:ring-2 focus:ring-[#9E3647]/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#4A121A]">
                    মোবাইল নাম্বার <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="customerPhone"
                    placeholder="01XXXXXXXXX"
                    className="min-h-12 w-full rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 text-sm text-[#2C0E14] outline-none placeholder:text-[#9E8289] focus:border-[#9E3647] focus:bg-white focus:ring-2 focus:ring-[#9E3647]/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#4A121A]">
                  পূর্ণ ঠিকানা <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="customerAddress"
                  placeholder="বাড়ি, রোড, এলাকা, থানা, জেলা"
                  className="h-28 w-full rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 text-sm text-[#2C0E14] outline-none placeholder:text-[#9E8289] focus:border-[#9E3647] focus:bg-white focus:ring-2 focus:ring-[#9E3647]/20"
                  required
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[#4A121A]">
                  ডেলিভারি এরিয়া <span className="text-red-500">*</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 has-[:checked]:border-[#9E3647] has-[:checked]:bg-[#FDF2F4]">
                    <input 
                      type="radio" 
                      name="deliveryZone" 
                      value="outside" 
                      checked={deliveryZone === "outside"}
                      onChange={() => setDeliveryZone("outside")}
                      className="h-4 w-4 accent-[#9E3647]" 
                      required 
                    />
                    <span className="text-sm font-medium text-[#4A121A]">ঢাকা সিটির বাইরে (১৫০ টাকা)</span>
                  </label>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 has-[:checked]:border-[#9E3647] has-[:checked]:bg-[#FDF2F4]">
                    <input 
                      type="radio" 
                      name="deliveryZone" 
                      value="inside" 
                      checked={deliveryZone === "inside"}
                      onChange={() => setDeliveryZone("inside")}
                      className="h-4 w-4 accent-[#9E3647]" 
                    />
                    <span className="text-sm font-medium text-[#4A121A]">ঢাকা সিটির ভিতরে (৮০ টাকা)</span>
                  </label>
                </div>
              </div>

              <input type="hidden" name="items" value={JSON.stringify(orderItems)} />
              <input type="hidden" name="color" value={orderItems[0]?.color || ""} />
              <input type="hidden" name="size" value={orderItems[0]?.size || ""} />
              <input type="hidden" name="quantity" value={totalQuantity} />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#4A121A]">নোট (ঐচ্ছিক)</label>
                  <input
                    name="note"
                    placeholder="বিশেষ নির্দেশনা"
                    className="min-h-12 w-full rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 text-sm text-[#2C0E14] outline-none placeholder:text-[#9E8289] focus:border-[#9E3647] focus:bg-white focus:ring-2 focus:ring-[#9E3647]/20"
                  />
                </div>
              </div>

              {/* Items List */}
              {orderItems.length > 0 ? (
                <div className="rounded-2xl border border-[#E8C4CE] bg-[#FDF2F4] p-4">
                  <p className="text-sm font-bold text-[#4A121A] mb-3">অর্ডারকৃত আইটেমসমূহ:</p>
                  <div className="space-y-2">
                     {orderItems.map((item, idx) => (
                      <div key={`${item.color}-${item.size}-${idx}`} className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E8D3C3] shadow-sm animate-fadeIn">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#4A121A] truncate">{item.color}</p>
                          <p className="text-xs text-[#7D525C]">সাইজ: {item.size || "সিলেক্ট করা হয়নি"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.color, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF4EF] text-[#4A121A] hover:bg-[#F3E7DE] font-bold transition"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-[#4A121A] tabular-nums">
                            {toBanglaDigits(item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.color, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF4EF] text-[#4A121A] hover:bg-[#F3E7DE] font-bold transition"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.color)}
                            className="ml-2 rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                            aria-label="মুছে ফেলুন"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] p-4">
                  <p className="text-sm font-bold text-[#4A121A]">অর্ডার সামারি</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-[#5C1724]">
                    {orderItems.length > 0 ? (
                      orderItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between gap-2 border-b border-[#E8D3C3] pb-1.5 last:border-0 last:pb-0">
                          <span className="break-all sm:break-normal">{item.color} ({item.size || "সাইজ সিলেক্ট করুন"}) x{toBanglaDigits(item.quantity)}</span>
                          <span className="font-semibold text-[#4A121A] shrink-0">{toMoney(discountedPrice * item.quantity)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-center text-[#9E7C84] py-2">কোনো পণ্য সিলেক্ট করা হয়নি</li>
                    )}
                    {/* Delivery Charge Line Item */}
                    {orderItems.length > 0 && (
                      <li className="flex justify-between gap-2 border-b border-[#E8D3C3] pb-1.5 text-[#5C1724]">
                        <span>ডেলিভারি চার্জ ({deliveryZone === "inside" ? "ঢাকা সিটি" : "ঢাকার বাইরে"}):</span>
                        <span className="font-semibold text-[#4A121A] shrink-0">{toMoney(deliveryCharge)}</span>
                      </li>
                    )}
                    <li className="flex justify-between gap-2 pt-2 font-bold text-[#4A121A] border-t border-[#E8D3C3]">
                      <span>মোট পরিমাণ:</span>
                      <span className="shrink-0">{toBanglaDigits(totalQuantity)} পিস</span>
                    </li>
                    <li className="flex justify-between gap-2 font-bold text-[#9E3647] text-base">
                      <span>সর্বমোট মূল্য:</span>
                      <span className="shrink-0">{toMoney(totalPrice)}</span>
                    </li>
                  </ul>
                {orderItems.some(item => !item.size) && orderItems.length > 0 ? (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span aria-hidden>⚠️</span>
                    অনুগ্রহ করে প্রতিটি সিলেক্ট করা রঙের সাইজ সিলেক্ট করুন
                  </p>
                ) : null}
                {orderItems.length === 0 ? (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <span aria-hidden>⚠️</span>
                    অনুগ্রহ করে অন্তত একটি রঙ ও সাইজ সিলেক্ট করুন
                  </p>
                ) : null}
              </div>

              {orderState.error ? <p className="text-sm text-red-600">{orderState.error}</p> : null}
              {orderState.success ? <p className="text-sm text-[#9E3647] font-semibold">{orderState.success}</p> : null}

              <button
                type="submit"
                disabled={orderPending || orderItems.length === 0 || orderItems.some(item => !item.size)}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9E3647] via-[#8B2C3B] to-[#73202E] px-4 py-3.5 text-base font-bold text-white shadow-xl shadow-[#9E3647]/30 hover:from-[#B04D5F] hover:to-[#8B2C3B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden>✓</span>
                {orderPending ? "প্রক্রিয়াধীন..." : "অর্ডার কনফার্ম করুন"}
              </button>
              <p className="flex items-center justify-center gap-2 text-center text-xs text-[#7D525C]">
                <span aria-hidden>🔒</span>
                Your information is fully secure
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ + reviews */}
      <div className="w-full border-t border-[#E8D3C3] bg-[#F5E6DC]">
        <div className="container-page mx-auto max-w-6xl space-y-8 py-10 pb-28 md:space-y-10 md:py-14 md:pb-14">
          <section className="w-full rounded-3xl bg-white/95 p-5 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:p-8 lg:p-10">
            <h2 className="text-center text-lg font-bold text-[#4A121A] md:text-xl">
              <span className="text-[#9E3647]" aria-hidden>
                ❓
              </span>{" "}
              সাধারণ প্রশ্নাবলী
            </h2>
            <div className="mx-auto mt-6 w-full max-w-4xl space-y-2 md:mt-8">
              {product.faqs.map((item, idx) => (
                <div key={`${item.question}-${idx}`} className="overflow-hidden rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF]">
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex((prev) => (prev === idx ? null : idx))}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3.5 text-left md:px-5 md:py-4"
                  >
                    <span className="text-sm font-semibold text-[#4A121A] md:text-base">{item.question}</span>
                    <span className="shrink-0 text-[#7D525C]">{faqOpenIndex === idx ? "⌃" : "⌄"}</span>
                  </button>
                  {faqOpenIndex === idx ? (
                    <p className="border-t border-[#E8D3C3] px-4 py-3 text-sm leading-relaxed text-[#5C1724] md:px-5 md:text-base">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {displayedReviews.length > 0 ? (
            <section className="w-full rounded-3xl bg-white/95 p-5 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:p-8 lg:p-10">
              <h2 className="text-center text-lg font-bold text-[#4A121A] md:text-xl">
                <span className="text-[#D4A343]" aria-hidden>
                  ⭐
                </span>{" "}
                গ্রাহক মতামত
              </h2>
              <div className="mt-6 grid w-full gap-4 sm:grid-cols-2 md:mt-8 lg:grid-cols-3">
                {displayedReviews.map((rev, idx) => (
                  <article
                    key={`${rev.author}-${idx}`}
                    className={`flex flex-col rounded-2xl border border-[#E8D3C3] p-4 md:p-5 ${reviewCardTones[idx % reviewCardTones.length]}`}
                  >
                    <p className="text-[#D4A343]">{Array.from({ length: Math.min(5, rev.rating) }).map(() => "★").join("")}</p>
                    <p className="mt-2 text-sm font-semibold text-[#4A121A] md:text-base">খুবই সন্তুষ্ট!</p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5C1724] md:text-[15px]">{rev.text}</p>
                    <p className="mt-4 text-xs font-semibold text-[#7D525C] md:text-sm">
                      — {rev.author}, {rev.location}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* Stats strip */}
          <div className="w-full rounded-2xl bg-white/95 px-4 py-8 shadow-[0_12px_40px_rgba(74,18,26,0.06)] border border-[#E8D3C3] md:rounded-3xl md:px-8 md:py-10">
            <div className="mx-auto grid max-w-4xl grid-cols-3 gap-1.5 text-center sm:gap-8">
              <div>
                <p className="text-xl font-bold text-[#9E3647] sm:text-2xl md:text-3xl">৫.০</p>
                <p className="mt-1 text-[9px] font-bold leading-tight text-[#7D525C] sm:text-xs md:text-sm">গড় রেটিং</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[#D4A343] sm:text-2xl md:text-3xl">১২০০+</p>
                <p className="mt-1 text-[9px] font-bold leading-tight text-[#7D525C] sm:text-xs md:text-sm">সন্তুষ্ট গ্রাহক</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[#C46476] sm:text-2xl md:text-3xl">৯৯%</p>
                <p className="mt-1 text-[9px] font-bold leading-tight text-[#7D525C] sm:text-xs md:text-sm">ইতিবাচক রিভিউ</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site footer */}
      <footer className="relative w-full overflow-hidden border-t border-[#6E2A37] bg-gradient-to-b from-[#3D101A] via-[#2D0A12] to-[#1E050B] pb-24 text-[#FAF3EE] md:pb-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,163,67,0.2), transparent 55%)"
          }}
        />
        <div className="container-page relative mx-auto py-14 md:py-20 lg:py-24">
          <div className="flex flex-col items-center justify-center text-center gap-8">
            <div className="flex flex-col items-center justify-center max-w-lg">
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpeg"
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shadow-lg ring-2 ring-[#D4A343]/60 ring-offset-2 ring-offset-[#2D0A12]"
                />
                <div>
                  <p className="font-display text-2xl font-semibold tracking-tight text-[#FAF3EE] md:text-3xl">{companyName}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#E8C7B0]">Premium fashion</p>
                </div>
              </div>

              <a
                href={callLink}
                className="group mt-6 inline-flex items-center gap-3 text-base font-medium tracking-tight text-[#E8C7B0] transition hover:text-[#D4A343]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4A343]/20 text-[#D4A343] ring-1 ring-[#D4A343]/35 transition group-hover:bg-[#D4A343]/30">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 10.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                    />
                  </svg>
                </span>
                <span className="tabular-nums">{displayContact}</span>
              </a>

              <div className="mt-4 flex flex-col items-center gap-2 text-xs sm:text-sm text-[#E8C7B0]">
                <p className="flex items-center gap-1.5">
                  <span className="text-[#D4A343]" aria-hidden>📍</span> Mirpur 10, Dhaka
                </p>
                <a
                  href="mailto:arambar.saili@gmail.com"
                  className="flex items-center gap-1.5 hover:text-[#D4A343] transition"
                >
                  <span className="text-[#D4A343]" aria-hidden>✉️</span> arambar.saili@gmail.com
                </a>
              </div>

              <p className="mt-4 text-sm font-light leading-relaxed text-[#E8C7B0] md:text-[15px]">
                ক্যাশ অন ডেলিভারি <span className="mx-2 text-[#6E2A37]">|</span> সারাদেশে ডেলিভারি
              </p>

              <div className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#D4A343]/70 to-transparent mx-auto" aria-hidden />

              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C49FA7]">
                © {new Date().getFullYear()} সর্বস্বত্ব সংরক্ষিত
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#C49FA7]">Developed by</p>
              <a
                href="https://websy.bd"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-1 rounded-2xl p-0 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A343]/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/websy-white.png"
                  alt="Websy"
                  className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="text-xs font-normal tracking-wide text-white/70 transition group-hover:text-[#D4A343]">
                  websy.bd
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <a
        href={whatsappLink}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_32px_rgba(37,211,102,0.45)] ring-2 ring-white/30 transition hover:scale-105 hover:bg-[#20BD5A] hover:shadow-[0_12px_40px_rgba(37,211,102,0.55)] md:bottom-8"
        aria-label="WhatsApp এ চ্যাট করুন"
      >
        <WhatsAppIcon className="h-8 w-8" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D3C3] bg-[#FAF3EE]/95 p-3 backdrop-blur-md md:hidden">
        <div className="flex gap-2 max-w-6xl mx-auto px-4">
          <a
            href="#color-selector"
            className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#B04D5F] to-[#7E2535] px-3 py-3 text-center text-sm font-bold text-white shadow-md"
          >
            অর্ডার করুন
          </a>
          <a
            href={whatsappLink}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-3 text-center text-sm font-bold text-white shadow-md"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0" />
            WhatsApp
          </a>
        </div>
      </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          {/* Confetti Animation keyframes */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
            }
            @keyframes scaleUp {
              0% { transform: scale(0.9); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            .animate-scaleUp {
              animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
          `}} />

          {/* Confetti Particles */}
          {Array.from({ length: 80 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 4;
            const duration = Math.random() * 3 + 2.5;
            const size = Math.random() * 8 + 6;
            const color = ["#9e3647", "#d4a343", "#c85a32", "#eaa4b0", "#8b2c3b", "#e2b755"][Math.floor(Math.random() * 6)];
            const shape = Math.random() > 0.5 ? "rounded-full" : "rounded-sm";
            return (
              <div
                key={i}
                className={`fixed top-0 z-50 pointer-events-none ${shape}`}
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * (Math.random() > 0.5 ? 1.5 : 1)}px`,
                  backgroundColor: color,
                  animation: `fall ${duration}s linear ${delay}s infinite`,
                }}
              />
            );
          })}

          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(74,18,26,0.15)] border border-[#E8C4CE] text-[#4A121A] animate-scaleUp">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF2F4] text-3xl shadow-inner border border-[#E8C4CE] text-[#9E3647] animate-bounce">
              🎉
            </div>

            <h3 className="mt-4 font-display text-xl font-bold text-[#4A121A] md:text-2xl">
              অর্ডারটি সফল হয়েছে!
            </h3>
            <p className="mt-2 text-xs text-[#7D525C]">
              অর্ডার আইডি: <span className="font-semibold text-[#9E3647] select-all">{orderState.success?.replace("Order placed successfully: ", "")}</span>
            </p>

            <div className="mt-5 rounded-2xl bg-[#FAF4EF] p-4 text-left text-sm border border-[#E8D3C3]">
              <p className="font-semibold text-[#4A121A] mb-2 border-b border-[#E8D3C3] pb-1.5 flex items-center gap-1">
                <span>📋</span> অর্ডার বিবরণ:
              </p>
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-[#5C1724]">
                    <span>{item.color} ({item.size}) x{toBanglaDigits(item.quantity)}</span>
                    <span className="font-medium">{toMoney(discountedPrice * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-[#5C1724] border-t border-[#E8D3C3] pt-1.5">
                  <span>ডেলিভারি চার্জ ({deliveryZone === "inside" ? "ঢাকা সিটি" : "ঢাকার বাইরে"}):</span>
                  <span>{toMoney(deliveryCharge)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#9E3647] border-t border-[#E8D3C3] pt-2">
                  <span>সর্বমোট মূল্য:</span>
                  <span>{toMoney(totalPrice)}</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#7D525C]">
              আমাদের একজন প্রতিনিধি খুব শীঘ্রই আপনার ঠিকানায় পণ্যটি পাঠানোর জন্য মোবাইল নাম্বারে কল করে কনফার্ম করবেন।
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="mt-6 min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#9E3647] to-[#73202E] hover:from-[#B04D5F] hover:to-[#8B2C3B] font-bold text-sm text-white transition active:scale-95 shadow-md shadow-[#9E3647]/20"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
