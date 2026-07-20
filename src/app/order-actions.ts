"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createOrder } from "@/lib/order-store";
import { calculateFinalPrice, readProductData } from "@/lib/product-store";
import { sendCapiPurchase } from "@/lib/meta-capi";

const orderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerAddress: z.string().min(5),
  color: z.string().optional(),
  size: z.string().optional(),
  quantity: z.coerce.number().int().optional(),
  deliveryZone: z.enum(["inside", "outside"]).optional(),
  note: z.string().optional(),
  items: z.string().optional()
});

export interface PlaceOrderResult {
  error?: string;
  success?: string;
  purchaseDetails?: {
    eventId: string;
    value: number;
    currency: string;
    contentName: string;
    numItems: number;
  };
}

export async function placeOrderAction(
  _prev: PlaceOrderResult | undefined,
  formData: FormData
): Promise<PlaceOrderResult> {
  const parsed = orderSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerAddress: formData.get("customerAddress"),
    color: formData.get("color") ?? undefined,
    size: formData.get("size") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    deliveryZone: formData.get("deliveryZone") ?? undefined,
    note: formData.get("note"),
    items: formData.get("items") ?? undefined
  });

  if (!parsed.success) return { error: "Please fill all required order fields correctly." };

  try {
    let itemsList: { color: string; size: string; quantity: number }[] = [];
    if (parsed.data.items) {
      try {
        itemsList = JSON.parse(parsed.data.items);
      } catch (e) {
        console.error("Failed to parse order items JSON:", e);
      }
    }

    if (itemsList.length === 0) {
      const colorVal = parsed.data.color || "";
      const sizeVal = parsed.data.size || "";
      const qtyVal = Number(parsed.data.quantity || 1);
      if (colorVal && sizeVal && qtyVal > 0) {
        itemsList = [{ color: colorVal, size: sizeVal, quantity: qtyVal }];
      } else {
        return { error: "অনুগ্রহ করে রঙ ও সাইজ সিলেক্ট করুন।" };
      }
    }

    const totalQuantity = itemsList.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity <= 0) {
      return { error: "অর্ডার করার জন্য অন্তত ১টি পণ্য থাকতে হবে।" };
    }

    const product = await readProductData();
    const unitPrice = calculateFinalPrice(product);
    const totalPrice = unitPrice * totalQuantity;

    const deliveryLine =
      parsed.data.deliveryZone === "inside"
        ? "ডেলিভারি: ঢাকা সিটির ভিতরে (৮০ টাকা)"
        : parsed.data.deliveryZone === "outside"
          ? "ডেলিভারি: ঢাকা সিটির বাইরে (১৫০ টাকা)"
          : "";
    const noteParts = [deliveryLine, parsed.data.note].filter((part) => part && String(part).trim().length > 0);

    const selectedColor = itemsList.map(i => i.color).filter((v, idx, arr) => arr.indexOf(v) === idx).join(", ");
    const selectedSize = itemsList.map(i => i.size).filter((v, idx, arr) => arr.indexOf(v) === idx).join(", ");

    const order = await createOrder({
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerAddress: parsed.data.customerAddress,
      productTitle: product.title,
      selectedColor,
      selectedSize,
      quantity: totalQuantity,
      unitPrice,
      totalPrice,
      note: noteParts.join("\n"),
      items: itemsList
    });

    // Fire Meta Conversions API Purchase event (non-blocking)
    const capiEventId = randomUUID();
    void sendCapiPurchase({
      eventId: capiEventId,
      value: totalPrice,
      currency: "BDT",
      phone: parsed.data.customerPhone,
      contentName: product.title,
      numItems: totalQuantity
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return {
      success: `Order placed successfully: ${order.id}`,
      purchaseDetails: {
        eventId: capiEventId,
        value: totalPrice,
        currency: "BDT",
        contentName: product.title,
        numItems: totalQuantity
      }
    };
  } catch (err) {
    console.error("[placeOrderAction]", err);
    const raw = err instanceof Error ? err.message : "";
    if (raw.includes("BLOB_READ_WRITE_TOKEN") || raw.includes("read-only")) {
      return {
        error:
          "অর্ডার সংরক্ষণ করা যাচ্ছে না: সার্ভারে স্টোরেজ সেট করা হয়নি। সাইট মালিককে জানান (Vercel এ BLOB_READ_WRITE_TOKEN যোগ করতে হবে)।"
      };
    }
    if (raw.includes("Blob") || raw.includes("blob")) {
      return {
        error:
          "অর্ডার সংরক্ষণ করা যায়নি (স্টোরেজ)। একটু পরে আবার চেষ্টা করুন। যদি সমস্যা থাকে, সাইট মালিককে জানান।"
      };
    }
    return {
      error: "অর্ডার সংরক্ষণ করা যায়নি। একটু পরে আবার চেষ্টা করুন।"
    };
  }
}
