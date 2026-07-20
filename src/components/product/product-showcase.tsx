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
      ? `-${toBanglaDigits(Math.round(product.discountValue))}% ছাড়`
      : product.discountType === "flat" && savedAmount > 0
        ? `-${toBanglaDigits(percentOff)}% ছাড়`
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
      .slice(0, 6);
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
      
      {/* Top Royal Announcement Bar */}
      <div className="bg-gradient-to-r from-[#4A121A] via-[#73202E] to-[#4A121A] py-2 px-4 text-center text-xs sm:text-sm font-medium text-[#FDF5EE] shadow-sm border-b border-[#D4A343]/30">
        <div className="container-page flex items-center justify-center gap-2">
          <span className="text-[#D4A343]">👑</span>
          <span className="truncate"><strong>আড়ম্বর শৈলী</strong> প্রিমিয়াম ফ্যাশন সংগ্রহ — ক্যাশ অন ডেলিভারিতে সারাদেশে ডেলিভারি!</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#E8D3C3] bg-[#FAF3EE]/90 shadow-[0_4px_25px_rgba(74,18,26,0.05)] backdrop-blur-xl">
        <div className="container-page flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Logo */}
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpeg"
                alt={companyName}
                className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full object-cover shadow-xl ring-2 sm:ring-4 ring-[#D4A343]/70 ring-offset-2 ring-offset-[#FAF3EE] transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute -bottom-1 -right-1 bg-[#D4A343] text-white rounded-full p-1 text-[10px] shadow-md">
                ✨
              </div>
            </div>

            <div>
              <p className="font-display text-base sm:text-lg md:text-xl font-bold tracking-tight text-[#4A121A]">{companyName}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-[#8B2C3B] tracking-wide">রুচিশীলতা তোমার, আড়ম্বর শৈলী সবার</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={callLink}
              className="hidden items-center gap-2 rounded-full border border-[#E8D3C3] bg-white px-3 py-1.5 text-xs font-semibold text-[#5C1724] shadow-sm transition hover:border-[#9E3647] hover:text-[#9E3647] sm:flex"
            >
              <span className="text-[#9E3647]">📞</span>
              <span className="tabular-nums">{displayContact}</span>
            </a>
            <a
              href={whatsappLink}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#20BD5A] hover:shadow-md"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0 text-white" />
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <section className="container-page pb-32 pt-6 md:pb-28 md:pt-8">
        
        {/* Decorative Tagline Banner */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-white via-[#FAF4EF] to-white p-4 sm:p-6 shadow-[0_10px_30px_rgba(74,18,26,0.04)] border border-[#E8D3C3] text-center">
          <span className="inline-block rounded-full bg-[#FDF0F2] px-3.5 py-1 text-xs font-bold text-[#9E3647] border border-[#E8C4CE] mb-2">
            ✨ প্রিমিয়াম কোয়ালিটি গ্যারান্টি
          </span>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[#4A121A] tracking-tight">
            {product.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#7D525C] max-w-xl mx-auto">
            সেরা মানের ফেব্রিক ও আধুনিক ডিজাইনের অনন্য সমন্বয় — আজই আপনার পছন্দের কালার অর্ডার করুন
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          
          {/* Left: Product Image Gallery */}
          <aside className="lg:sticky lg:top-[5.5rem] lg:self-start">
            <div className="luxury-card luxury-card-hover p-3.5 md:p-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#FAF4EF] border border-[#E8D3C3]/60 group">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getDisplayImageUrl(activeImage)}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9E7C84]">কোনো ছবি নেই</div>
                )}

                {discountBadgeBn ? (
                  <span className="absolute left-4 top-4 rounded-xl bg-gradient-to-r from-[#D96B43] via-[#C85A32] to-[#B44622] px-3 py-1.5 text-xs font-extrabold text-white shadow-lg tracking-wider">
                    🔥 {discountBadgeBn}
                  </span>
                ) : null}

                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#4A121A] shadow-lg border border-[#E8D3C3] hover:bg-white transition active:scale-90"
                      aria-label="আগের ছবি"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-3 top-1/2 flex h-10 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#4A121A] shadow-lg border border-[#E8D3C3] hover:bg-white transition active:scale-90"
                      aria-label="পরের ছবি"
                    >
                      ›
                    </button>
                  </>
                ) : null}

                {images.length > 0 ? (
                  <span className="absolute bottom-4 right-4 rounded-full bg-[#4A121A]/85 backdrop-blur-md px-3 py-1 text-xs font-bold text-[#FAF3EE] shadow-md">
                    {toBanglaDigits(imageIndex + 1)} / {toBanglaDigits(images.length)}
                  </span>
                ) : null}
              </div>

              {/* Thumbnails */}
              {product.variants.length > 0 ? (
                <div className="relative mt-4 w-full overflow-hidden">
                  <div className="flex gap-2.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
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
                            className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                              selected 
                                ? "border-[#9E3647] shadow-lg ring-4 ring-[#9E3647]/20 scale-105" 
                                : "border-[#E8D3C3] opacity-75 hover:opacity-100 hover:scale-100"
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

          {/* Right: Product Details & Form */}
          <div className="space-y-6">
            
            {/* Product Overview Card */}
            <div className="luxury-card luxury-card-hover p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9E3647] bg-[#FDF0F2] border border-[#E8C4CE] px-3 py-1 rounded-full">
                  {companyName}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  ইন স্টক - সরাসরি ডেলিভারি
                </span>
              </div>

              <h1 className="font-display mt-3 text-2xl sm:text-3xl font-bold text-[#4A121A] leading-snug">
                {product.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex text-[#D4A343] text-lg">★★★★★</div>
                <span className="text-xs font-semibold text-[#7D525C] bg-[#FAF4EF] px-2.5 py-0.5 rounded-md border border-[#E8D3C3]">
                  ৫.০ ({reviewCountBn} ভেরিফাইড রিভিউ)
                </span>
              </div>

              {/* Price Banner */}
              <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#FAF4EF] via-[#FDF8F5] to-[#FAF4EF] p-4 border border-[#E8D3C3] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#7D525C] font-semibold">অফার মূল্য:</p>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#9E3647]">{toMoney(discountedPrice)}</p>
                    {product.discountType !== "none" ? (
                      <p className="text-lg text-[#9E7C84] line-through font-medium">{toMoney(product.basePrice)}</p>
                    ) : null}
                  </div>
                </div>

                {product.discountType === "percent" ? (
                  <span className="rounded-xl bg-[#9E3647] px-3 py-1.5 text-xs font-bold text-white shadow-md">
                    -{toBanglaDigits(Math.round(product.discountValue))}% বিশেষ ছাড়
                  </span>
                ) : savedAmount > 0 ? (
                  <span className="rounded-xl bg-[#9E3647] px-3 py-1.5 text-xs font-bold text-white shadow-md">
                    ৳{toBanglaDigits(savedAmount)} সাশ্রয়
                  </span>
                ) : null}
              </div>

              {/* Description List */}
              {featureLines.length > 0 ? (
                <div className="mt-6 border-t border-[#E8D3C3] pt-5">
                  <p className="text-xs font-bold text-[#4A121A] uppercase tracking-wider mb-3">পণ্যের বিবরণী:</p>
                  <ul className="grid gap-2.5 text-sm text-[#4A121A]">
                    {featureLines.map((line) => (
                      <li key={line} className="flex items-start gap-2.5 bg-[#FAF4EF]/60 p-2.5 rounded-xl border border-[#E8D3C3]/50">
                        <span className="shrink-0 text-[#9E3647] font-bold">✨</span>
                        <span className="leading-relaxed font-medium">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Quick Action Buttons */}
              <div className="mt-6 space-y-3">
                <a
                  href="#color-selector"
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9E3647] via-[#B04D5F] to-[#73202E] px-4 py-4 text-base font-bold text-white shadow-xl shadow-[#9E3647]/25 transition-all duration-300 hover:from-[#B04D5F] hover:to-[#9E3647] hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>🛒</span>
                  এখনই অর্ডার করুন
                </a>

                <a
                  href={callLink}
                  aria-label={`কল করুন ${displayContact}`}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#D4A343] bg-gradient-to-r from-[#FAF4EF] to-white px-4 py-3 text-sm font-bold text-[#5C1724] shadow-sm transition hover:bg-[#FAF4EF]"
                >
                  <span className="text-[#D4A343]">📞</span>
                  সরাসরি কথা বলুন: <span className="tabular-nums font-bold text-[#9E3647]">{displayContact}</span>
                </a>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "🚚", title: "সারাদেশে ডেলিভারি", sub: "২-৪ কার্যদিবসে" },
                { icon: "💵", title: "ক্যাশ অন ডেলিভারি", sub: "পণ্য দেখে পেমেন্ট" },
                { icon: "🛡️", title: "১০০% প্রিমিয়াম", sub: "গুণগত মান নিশ্চিত" }
              ].map((item) => (
                <div 
                  key={item.title} 
                  className="luxury-card p-3 sm:p-4 text-center hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="text-2xl sm:text-3xl block mb-1" aria-hidden>{item.icon}</span>
                  <p className="text-xs font-bold text-[#4A121A]">{item.title}</p>
                  <p className="text-[10px] text-[#7D525C] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Color & Size Selector Studio */}
            <div id="color-selector" className="luxury-card luxury-card-hover p-6 md:p-8">
              <div className="flex items-center gap-3 border-b border-[#E8D3C3] pb-4 mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FDF0F2] text-[#9E3647] text-xl font-bold border border-[#E8C4CE]">
                  🎨
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#4A121A]">১. রঙ ও সাইজ নির্বাচন করুন</h3>
                  <p className="text-xs text-[#7D525C]">আপনি একটি বা একাধিক রঙ নির্বাচন করতে পারেন</p>
                </div>
              </div>

              <div className="space-y-4">
                {product.variants.map((variant, idx) => {
                  const previewImage = variant.images[0];
                  const isChecked = !!selectedColors[variant.colorName];
                  
                  return (
                    <div
                      key={`${variant.colorName}-${idx}`}
                      onClick={() => handleCardClick(idx)}
                      className={`relative flex flex-col rounded-2xl border p-4 transition-all duration-300 cursor-pointer select-none ${
                        isChecked 
                          ? "border-[#9E3647] bg-[#FDF2F4] shadow-md ring-2 ring-[#9E3647]/20" 
                          : "border-[#E8D3C3] bg-[#FAF4EF] hover:border-[#C88A96] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Checkbox */}
                        <div
                          onClick={(e) => handleCheckboxToggle(idx, e)}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                            isChecked
                              ? "border-[#9E3647] bg-[#9E3647] text-white shadow-sm scale-105"
                              : "border-[#E8D3C3] bg-white"
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
                          <p className="font-bold text-[#4A121A] text-base">{variant.colorName}</p>
                          <p className="text-xs mt-0.5">
                            {product.discountType !== "none" ? (
                              <>
                                <span className="line-through text-[#9E7C84] mr-2">{toMoney(product.basePrice)}</span>
                                <span className="font-bold text-[#9E3647] text-sm">{toMoney(discountedPrice)}</span>
                              </>
                            ) : (
                              <span className="font-bold text-[#9E3647] text-sm">{toMoney(discountedPrice)}</span>
                            )}
                          </p>
                        </div>

                        {/* Preview Image */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E8D3C3] bg-white shadow-sm">
                          {previewImage ? (
                            <img src={getDisplayImageUrl(previewImage)} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                      </div>

                      {/* Size Selector inside card */}
                      {isChecked && (
                        <div 
                          className="mt-4 border-t border-[#E8D3C3] pt-3 animate-fadeIn" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-bold text-[#4A121A] mb-2">সাইজ সিলেক্ট করুন:</p>
                          <div className="flex flex-wrap gap-2">
                            {variant.sizes.map((s) => {
                              const isSizeSelected = selectedSizes[variant.colorName] === s;
                              return (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => {
                                    setSelectedSizes((prev) => ({ ...prev, [variant.colorName]: s }));
                                  }}
                                  className={`min-h-11 min-w-[3rem] rounded-xl border px-4 py-2 text-sm font-bold transition active:scale-95 ${
                                    isSizeSelected
                                      ? "border-[#9E3647] bg-[#9E3647] text-white shadow-md shadow-[#9E3647]/20 scale-105"
                                      : "border-[#E8D3C3] bg-white text-[#4A121A] hover:bg-[#FAF4EF]"
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

            {/* Order Form */}
            <form
              id="order-form"
              action={orderAction}
              className="luxury-card luxury-card-hover p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-[#E8D3C3] pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FDF0F2] text-[#9E3647] text-xl font-bold border border-[#E8C4CE]">
                  📝
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#4A121A]">২. আপনার ডেলিভারি তথ্য দিন</h3>
                  <p className="text-xs text-[#7D525C]">সঠিক নাম, মোবাইল নাম্বার ও সম্পূর্ণ ঠিকানা লিখুন</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#4A121A] uppercase tracking-wider">
                    আপনার নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="customerName"
                    placeholder="আপনার পূর্ণ নাম লিখুন"
                    className="admin-input"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#4A121A] uppercase tracking-wider">
                    মোবাইল নাম্বার <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="customerPhone"
                    placeholder="01XXXXXXXXX"
                    className="admin-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#4A121A] uppercase tracking-wider">
                  পূর্ণ ঠিকানা <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="customerAddress"
                  placeholder="বাড়ি/ফ্ল্যাট নম্বর, রোড নম্বর, এলাকা, থানা, জেলা"
                  className="h-28 w-full rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] px-4 py-3 text-sm text-[#2C0E14] outline-none placeholder:text-[#9E8289] focus:border-[#9E3647] focus:bg-white focus:ring-2 focus:ring-[#9E3647]/20"
                  required
                />
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold text-[#4A121A] uppercase tracking-wider">
                  ডেলিভারি এলাকা <span className="text-red-500">*</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#E8D3C3] bg-[#FAF4EF] p-4 transition-all has-[:checked]:border-[#9E3647] has-[:checked]:bg-[#FDF2F4] has-[:checked]:shadow-sm">
                    <input 
                      type="radio" 
                      name="deliveryZone" 
                      value="outside" 
                      checked={deliveryZone === "outside"}
                      onChange={() => setDeliveryZone("outside")}
                      className="h-4 w-4 accent-[#9E3647]" 
                      required 
                    />
                    <div>
                      <p className="text-sm font-bold text-[#4A121A]">ঢাকার বাইরে</p>
                      <p className="text-xs font-semibold text-[#9E3647]">চার্জ: ১৫০ টাকা</p>
                    </div>
                  </label>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#E8D3C3] bg-[#FAF4EF] p-4 transition-all has-[:checked]:border-[#9E3647] has-[:checked]:bg-[#FDF2F4] has-[:checked]:shadow-sm">
                    <input 
                      type="radio" 
                      name="deliveryZone" 
                      value="inside" 
                      checked={deliveryZone === "inside"}
                      onChange={() => setDeliveryZone("inside")}
                      className="h-4 w-4 accent-[#9E3647]" 
                    />
                    <div>
                      <p className="text-sm font-bold text-[#4A121A]">ঢাকা সিটি</p>
                      <p className="text-xs font-semibold text-[#9E3647]">চার্জ: ৮০ টাকা</p>
                    </div>
                  </label>
                </div>
              </div>

              <input type="hidden" name="items" value={JSON.stringify(orderItems)} />
              <input type="hidden" name="color" value={orderItems[0]?.color || ""} />
              <input type="hidden" name="size" value={orderItems[0]?.size || ""} />
              <input type="hidden" name="quantity" value={totalQuantity} />

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#4A121A] uppercase tracking-wider">বিশেষ নোট (ঐচ্ছিক)</label>
                <input
                  name="note"
                  placeholder="যেমন: বিকেলে ডেলিভারি দেবেন"
                  className="admin-input"
                />
              </div>

              {/* Order Summary Receipt */}
              <div className="rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8D3C3] pb-2">
                  <p className="text-sm font-bold text-[#4A121A] flex items-center gap-1.5">
                    <span>🧾</span> অর্ডার সামারি
                  </p>
                  <span className="text-xs font-bold text-[#9E3647] bg-[#FDF0F2] px-2.5 py-0.5 rounded-full border border-[#E8C4CE]">
                    {toBanglaDigits(totalQuantity)} পিস
                  </span>
                </div>

                {orderItems.length > 0 ? (
                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-[#5C1724] bg-white p-2.5 rounded-xl border border-[#E8D3C3]/60">
                        <span className="font-semibold">{item.color} ({item.size || "সাইজ বেছে নিন"}) x{toBanglaDigits(item.quantity)}</span>
                        <span className="font-bold text-[#4A121A]">{toMoney(discountedPrice * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs text-[#7D525C] pt-1">
                      <span>ডেলিভারি চার্জ ({deliveryZone === "inside" ? "ঢাকা সিটি" : "ঢাকার বাইরে"}):</span>
                      <span className="font-semibold text-[#4A121A]">{toMoney(deliveryCharge)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-extrabold text-[#9E3647] border-t border-[#E8D3C3] pt-2.5">
                      <span>সর্বমোট মূল্য:</span>
                      <span className="text-xl">{toMoney(totalPrice)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-[#9E7C84] py-3">অনুগ্রহ করে উপরে রঙ ও সাইজ সিলেক্ট করুন</p>
                )}

                {orderItems.some(item => !item.size) && orderItems.length > 0 ? (
                  <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
                    ⚠️ অনুগ্রহ করে নির্বাচিত রঙটির সাইজ সিলেক্ট করুন
                  </p>
                ) : null}
              </div>

              {orderState.error ? <p className="text-sm text-red-600 font-semibold">{orderState.error}</p> : null}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={orderPending || orderItems.length === 0 || orderItems.some(item => !item.size)}
                className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#9E3647] via-[#B04D5F] to-[#73202E] px-6 py-4 text-lg font-extrabold text-white shadow-2xl shadow-[#9E3647]/30 transition-all duration-300 hover:from-[#B04D5F] hover:to-[#8B2C3B] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>✓</span>
                {orderPending ? "অর্ডার নেওয়া হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
              </button>

              <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-[#7D525C]">
                <span>🔒</span> আপনার তথ্য সম্পূর্ণ নিরাপদ | ক্যাশ অন ডেলিভারি
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ & Customer Reviews Section */}
      <div className="w-full border-t border-[#E8D3C3] bg-[#F5E6DC]/80">
        <div className="container-page mx-auto max-w-6xl space-y-10 py-12 pb-28 md:py-16 md:pb-16">
          
          {/* FAQ */}
          <section className="luxury-card p-6 md:p-10">
            <div className="text-center max-w-lg mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9E3647] bg-[#FDF0F2] border border-[#E8C4CE] px-3 py-1 rounded-full">
                FAQ
              </span>
              <h2 className="font-display text-2xl font-bold text-[#4A121A] mt-2 sm:text-3xl">
                সাধারণ প্রশ্নাবলী
              </h2>
            </div>

            <div className="mx-auto mt-8 w-full max-w-3xl space-y-3">
              {product.faqs.map((item, idx) => (
                <div key={`${item.question}-${idx}`} className="overflow-hidden rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] transition-all">
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex((prev) => (prev === idx ? null : idx))}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left font-bold text-[#4A121A] text-sm sm:text-base"
                  >
                    <span>{item.question}</span>
                    <span className="text-[#9E3647] text-lg font-bold">{faqOpenIndex === idx ? "−" : "+"}</span>
                  </button>
                  {faqOpenIndex === idx ? (
                    <p className="border-t border-[#E8D3C3] px-5 py-4 text-sm leading-relaxed text-[#5C1724] bg-white">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* Customer Reviews */}
          {displayedReviews.length > 0 ? (
            <section className="luxury-card p-6 md:p-10">
              <div className="text-center max-w-lg mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D4A343] bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  REVIEWS
                </span>
                <h2 className="font-display text-2xl font-bold text-[#4A121A] mt-2 sm:text-3xl">
                  গ্রাহক মতামত
                </h2>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {displayedReviews.map((rev, idx) => (
                  <article
                    key={`${rev.author}-${idx}`}
                    className="flex flex-col justify-between rounded-2xl border border-[#E8D3C3] bg-[#FAF4EF] p-5 shadow-sm hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[#D4A343] text-base">
                          {Array.from({ length: Math.min(5, rev.rating) }).map(() => "★").join("")}
                        </p>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ ভেরিফাইড
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[#4A121A] leading-relaxed">
                        &ldquo;{rev.text}&rdquo;
                      </p>
                    </div>
                    <p className="mt-4 text-xs font-bold text-[#7D525C] border-t border-[#E8D3C3]/60 pt-3">
                      — {rev.author}, {rev.location}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* Stats Bar */}
          <div className="luxury-card p-6 md:p-8">
            <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#9E3647]">৫.০ / ৫.০</p>
                <p className="mt-1 text-xs font-bold text-[#7D525C]">গড় কাস্টমার রেটিং</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#D4A343]">১২০০+</p>
                <p className="mt-1 text-xs font-bold text-[#7D525C]">সফল ডেলিভারি</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#C46476]">৯৯%</p>
                <p className="mt-1 text-xs font-bold text-[#7D525C]">পজিটিভ ফিডব্যাক</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative w-full overflow-hidden border-t border-[#6E2A37] bg-gradient-to-b from-[#3D101A] via-[#2D0A12] to-[#1E050B] pb-24 text-[#FAF3EE] md:pb-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,163,67,0.3), transparent 60%)"
          }}
        />
        <div className="container-page relative mx-auto py-14 md:py-20">
          <div className="flex flex-col items-center justify-center text-center gap-8">
            <div className="flex flex-col items-center justify-center max-w-lg">
              <div className="flex flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpeg"
                  alt={companyName}
                  className="h-24 w-24 sm:h-28 sm:w-28 md:h-36 md:w-36 rounded-full object-cover shadow-2xl ring-4 ring-[#D4A343]/70 ring-offset-4 ring-offset-[#2D0A12]"
                />
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF3EE] md:text-4xl">{companyName}</p>
                  <p className="mt-1 text-xs sm:text-sm font-semibold tracking-wider text-[#D4A343]">রুচিশীলতা তোমার, আড়ম্বর শৈলী সবার</p>
                </div>
              </div>

              <a
                href={callLink}
                className="group mt-6 inline-flex items-center gap-3 text-base font-bold tracking-tight text-[#E8C7B0] transition hover:text-[#D4A343]"
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

              <div className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#D4A343]/70 to-transparent mx-auto" aria-hidden />

              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C49FA7]">
                © {new Date().getFullYear()} {companyName}. সর্বস্বত্ব সংরক্ষিত
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

      {/* Floating WhatsApp Action */}
      <a
        href={whatsappLink}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-2 ring-white/30 transition-transform duration-300 hover:scale-110 md:bottom-8"
        aria-label="WhatsApp এ চ্যাট করুন"
      >
        <WhatsAppIcon className="h-8 w-8" />
      </a>

      {/* Mobile Sticky Order Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D3C3] bg-[#FAF3EE]/95 p-3 backdrop-blur-md md:hidden">
        <div className="flex gap-2 max-w-6xl mx-auto px-4">
          <a
            href="#color-selector"
            className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#9E3647] to-[#73202E] px-3 py-3 text-center text-sm font-bold text-white shadow-md flex items-center justify-center gap-1.5"
          >
            <span>🛒</span> অর্ডার করুন
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl border border-[#E8C4CE] text-[#4A121A] animate-scaleUp">
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
