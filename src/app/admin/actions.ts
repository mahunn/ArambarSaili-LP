"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readOrders, writeOrders } from "@/lib/order-store";
import { readProductData, writeProductData } from "@/lib/product-store";
import { put, del } from "@vercel/blob";
import { useBlobJsonPersistence } from "@/lib/vercel-blob-json";

function revalidateAdminPaths(orderId?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/product");
  revalidatePath("/admin/cms");
  if (orderId) {
    const seg = encodeURIComponent(orderId);
    revalidatePath(`/admin/orders/${seg}`);
    revalidatePath(`/admin/orders/${seg}/invoice`);
  }
}

function parseLines(input: string): string[] {
  return input
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function withNotice(url: string, notice: string, tone: "ok" | "error" = "ok"): string {
  const [base, query] = url.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set("notice", notice);
  params.set("tone", tone);
  return `${base}?${params.toString()}`;
}

function parseDiscountType(raw: FormDataEntryValue | null): "none" | "flat" | "percent" {
  const s = String(raw ?? "none").trim();
  if (s === "flat" || s === "percent" || s === "none") return s;
  return "none";
}

export async function updateProductBasics(formData: FormData) {
  const data = await readProductData();
  data.title = String(formData.get("title") ?? "").trim().slice(0, 120);
  data.description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  data.basePrice = Math.max(0, Number(formData.get("basePrice") ?? 0));
  data.discountType = parseDiscountType(formData.get("discountType"));
  data.discountValue = Math.max(0, Number(formData.get("discountValue") ?? 0));
  if (data.discountType === "percent") {
    data.discountValue = Math.min(data.discountValue, 100);
  }
  data.whatsappNumber = String(formData.get("whatsappNumber") ?? "").replace(/\D/g, "").slice(0, 20);
  data.callNumber = String(formData.get("callNumber") ?? "").replace(/\D/g, "").slice(0, 20);

  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "পণ্য তথ্য সেভ হয়েছে"));
}

export async function updateVariantData(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? 0);
  const colorName = String(formData.get("colorName") ?? "").trim().slice(0, 50);
  const sizes = parseLines(String(formData.get("sizes") ?? ""));

  if (!data.variants[variantIndex]) return;
  data.variants[variantIndex].colorName = colorName;
  data.variants[variantIndex].sizes = sizes;

  const file = formData.get("imageFile");
  if (file && file instanceof File && file.size > 0) {
    if (useBlobJsonPersistence()) {
      try {
        const blob = await put(`arambarsaili/uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
          access: "public",
          addRandomSuffix: false,
          cacheControlMaxAge: 31536000
        });
        data.variants[variantIndex].images.push(blob.url);
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() ?? "";
        if (msg.includes("private") || msg.includes("read access")) {
          console.warn("[updateVariantData] Public access failed on private store, retrying with private access.");
          const blob = await put(`arambarsaili/uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
            access: "private",
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000
          });
          data.variants[variantIndex].images.push(blob.url);
        } else {
          throw err;
        }
      }
    } else {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const bytes = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}-${safeFileName(file.name)}`;
      const fullPath = path.join(uploadDir, fileName);
      await fs.writeFile(fullPath, bytes);

      data.variants[variantIndex].images.push(`/uploads/${fileName}`);
    }
  }

  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "ভ্যারিয়েন্ট সেভ হয়েছে"));
}

export async function addVariant() {
  const data = await readProductData();
  data.variants.push({
    colorName: `Color ${data.variants.length + 1}`,
    sizes: ["M", "L"],
    images: []
  });
  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "নতুন কালার যোগ হয়েছে"));
}

export async function removeVariant(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? -1);
  if (variantIndex < 0 || variantIndex >= data.variants.length) return;
  if (data.variants.length <= 1) return;

  data.variants.splice(variantIndex, 1);
  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "ভ্যারিয়েন্ট মুছে ফেলা হয়েছে"));
}

export async function addFaq() {
  const data = await readProductData();
  data.faqs.push({
    question: `নতুন প্রশ্ন ${data.faqs.length + 1}`,
    answer: "এখানে উত্তর লিখুন।"
  });
  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/cms", "নতুন FAQ যোগ হয়েছে"));
}

export async function updateFaq(formData: FormData) {
  const data = await readProductData();
  const faqIndex = Number(formData.get("faqIndex") ?? -1);
  if (faqIndex < 0 || faqIndex >= data.faqs.length) return;

  data.faqs[faqIndex] = {
    question: String(formData.get("question") ?? "").trim().slice(0, 200),
    answer: String(formData.get("answer") ?? "").trim().slice(0, 1500)
  };
  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/cms", "FAQ আপডেট হয়েছে"));
}

export async function removeFaq(formData: FormData) {
  const data = await readProductData();
  const faqIndex = Number(formData.get("faqIndex") ?? -1);
  if (faqIndex < 0 || faqIndex >= data.faqs.length) return;
  data.faqs.splice(faqIndex, 1);
  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/cms", "FAQ মুছে ফেলা হয়েছে"));
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadVariantImage(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? -1);
  const file = formData.get("imageFile");
  if (variantIndex < 0 || variantIndex >= data.variants.length) return;
  if (!(file instanceof File) || file.size === 0) return;

  if (useBlobJsonPersistence()) {
    try {
      const blob = await put(`arambarsaili/uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
        access: "public",
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000
      });
      data.variants[variantIndex].images.push(blob.url);
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("private") || msg.includes("read access")) {
        console.warn("[uploadVariantImage] Public access failed on private store, retrying with private access.");
        const blob = await put(`arambarsaili/uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
          access: "private",
          addRandomSuffix: false,
          cacheControlMaxAge: 31536000
        });
        data.variants[variantIndex].images.push(blob.url);
      } else {
        throw err;
      }
    }
  } else {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${safeFileName(file.name)}`;
    const fullPath = path.join(uploadDir, fileName);
    await fs.writeFile(fullPath, bytes);

    data.variants[variantIndex].images.push(`/uploads/${fileName}`);
  }

  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "ছবি আপলোড সফল হয়েছে"));
}

export async function removeVariantImage(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? -1);
  const imageIndex = Number(formData.get("imageIndex") ?? -1);

  if (variantIndex < 0 || variantIndex >= data.variants.length) return;
  if (imageIndex < 0 || imageIndex >= data.variants[variantIndex].images.length) return;

  const [removed] = data.variants[variantIndex].images.splice(imageIndex, 1);

  // Write product data immediately so image is removed from JSON instantly
  await writeProductData(data);
  revalidateAdminPaths();

  // Background non-blocking file deletion
  if (removed?.startsWith("/uploads/")) {
    const localPath = path.join(process.cwd(), "public", removed.replace(/^\//, ""));
    fs.unlink(localPath).catch(() => {});
  } else if (removed && useBlobJsonPersistence()) {
    del(removed).catch((err) => {
      console.warn("[removeVariantImage] Background blob deletion error:", err);
    });
  }

  redirect(withNotice("/admin/product", "ছবি মুছে ফেলা হয়েছে"));
}

export async function moveVariantImage(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? -1);
  const imageIndex = Number(formData.get("imageIndex") ?? -1);
  const direction = String(formData.get("direction") ?? "");

  if (variantIndex < 0 || variantIndex >= data.variants.length) return;

  const images = data.variants[variantIndex].images;
  if (imageIndex < 0 || imageIndex >= images.length) return;

  const targetIndex = direction === "up" ? imageIndex - 1 : imageIndex + 1;
  if (targetIndex < 0 || targetIndex >= images.length) return;

  const temp = images[targetIndex];
  images[targetIndex] = images[imageIndex];
  images[imageIndex] = temp;

  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "ছবির ক্রম পরিবর্তন হয়েছে"));
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const allowed = new Set(["pending", "confirmed", "shipped", "delivered", "canceled"]);
  if (!orderId || !allowed.has(status)) return;

  const orders = await readOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return;
  order.status = status as "pending" | "confirmed" | "shipped" | "delivered" | "canceled";

  await writeOrders(orders);
  revalidateAdminPaths(orderId);
  if (returnTo.startsWith("/admin")) {
    redirect(withNotice(returnTo, "স্ট্যাটাস আপডেট হয়েছে"));
  }
}

export async function updateOrderNote(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (!orderId) return;

  const orders = await readOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return;
  order.note = note;
  await writeOrders(orders);
  revalidateAdminPaths(orderId);
  if (returnTo.startsWith("/admin")) {
    redirect(withNotice(returnTo, "নোট সেভ হয়েছে"));
  }
}

export async function deleteOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (!orderId) return;

  const orders = await readOrders();
  const nextOrders = orders.filter((item) => item.id !== orderId);
  if (nextOrders.length === orders.length) return;

  await writeOrders(nextOrders);
  revalidateAdminPaths(orderId);
  if (returnTo.startsWith("/admin")) {
    redirect(withNotice(returnTo, "অর্ডার ডিলিট হয়েছে"));
  }
}
