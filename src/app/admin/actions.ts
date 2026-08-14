"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readOrders, writeOrders } from "@/lib/order-store";
import { readProductData, writeProductData, type ProductData, type ProductVariant } from "@/lib/product-store";
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

function parseSizes(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveUploadedFiles(files: File[]): Promise<string[]> {
  const validFiles = files.filter((f) => f && f instanceof File && f.size > 0);
  if (validFiles.length === 0) return [];

  const urls: string[] = [];

  if (useBlobJsonPersistence()) {
    for (const file of validFiles) {
      try {
        const blob = await put(`arambarsaili/uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
          access: "public",
          addRandomSuffix: false,
          cacheControlMaxAge: 31536000
        });
        urls.push(blob.url);
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() ?? "";
        if (msg.includes("private") || msg.includes("read access")) {
          console.warn("[saveUploadedFiles] Public access failed on private store, retrying with private access.");
          const blob = await put(`arambarsaili/uploads/${Date.now()}-${safeFileName(file.name)}`, file, {
            access: "private",
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000
          });
          urls.push(blob.url);
        } else {
          console.error("[saveUploadedFiles] Blob upload failed:", err);
          throw err;
        }
      }
    }
  } else {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of validFiles) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}-${safeFileName(file.name)}`;
      const fullPath = path.join(uploadDir, fileName);
      await fs.writeFile(fullPath, bytes);
      urls.push(`/uploads/${fileName}`);
    }
  }

  return urls;
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

export type SaveProductResult = {
  success: boolean;
  message?: string;
  error?: string;
  updatedProduct?: ProductData;
};

export async function saveCompleteProductAction(formData: FormData): Promise<SaveProductResult> {
  try {
    const current = await readProductData();

    const title = String(formData.get("title") ?? "").trim().slice(0, 120);
    const description = String(formData.get("description") ?? "").trim().slice(0, 1500);
    const basePrice = Math.max(0, Number(formData.get("basePrice") ?? 0));
    const discountType = parseDiscountType(formData.get("discountType"));
    let discountValue = Math.max(0, Number(formData.get("discountValue") ?? 0));
    if (discountType === "percent") {
      discountValue = Math.min(discountValue, 100);
    }
    const whatsappNumber = String(formData.get("whatsappNumber") ?? "").replace(/\D/g, "").slice(0, 20);
    const callNumber = String(formData.get("callNumber") ?? "").replace(/\D/g, "").slice(0, 20);

    // Parse variants JSON structure
    const rawVariantsJson = String(formData.get("variantsJson") ?? "[]");
    let parsedVariants: Array<{
      id: string;
      colorName: string;
      sizes: string[];
      existingImages: string[];
    }> = [];

    try {
      parsedVariants = JSON.parse(rawVariantsJson);
    } catch (err) {
      console.error("Failed to parse variants JSON:", err);
    }

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return { success: false, error: "কমপক্ষে ১টি কালার ভ্যারিয়েন্ট থাকতে হবে।" };
    }

    const finalVariants: ProductVariant[] = [];

    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];
      const colorName = String(v.colorName ?? `Color ${i + 1}`).trim() || `Color ${i + 1}`;
      const sizes = Array.isArray(v.sizes) && v.sizes.length > 0 ? v.sizes : ["M", "L", "XL"];
      const existingImages = Array.isArray(v.existingImages) ? v.existingImages.filter(Boolean) : [];

      // Check newly uploaded files for this variant: files_<id> or files_<i>
      const newFiles = [
        ...(formData.getAll(`files_${v.id}`) as File[]),
        ...(formData.getAll(`files_${i}`) as File[])
      ].filter((f) => f && f instanceof File && f.size > 0);

      const uploadedUrls = await saveUploadedFiles(newFiles);
      const combinedImages = [...existingImages, ...uploadedUrls];

      finalVariants.push({
        colorName,
        sizes,
        images: combinedImages
      });
    }

    const updatedProduct: ProductData = {
      title: title || current.title,
      description: description || current.description,
      basePrice: basePrice > 0 ? basePrice : current.basePrice,
      discountType,
      discountValue,
      whatsappNumber: whatsappNumber || current.whatsappNumber,
      callNumber: callNumber || current.callNumber,
      variants: finalVariants,
      faqs: current.faqs,
      reviews: current.reviews
    };

    await writeProductData(updatedProduct);
    revalidateAdminPaths();

    return {
      success: true,
      message: "পণ্যের সকল তথ্য ও কালার ভ্যারিয়েন্ট সফলভাবে সেভ হয়েছে!",
      updatedProduct
    };
  } catch (err: any) {
    console.error("[saveCompleteProductAction] Error:", err);
    return {
      success: false,
      error: err?.message || "পণ্য সংরক্ষণ করা সম্ভব হয়নি। একটু পরে আবার চেষ্টা করুন।"
    };
  }
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

export async function createNewVariant(formData: FormData) {
  const data = await readProductData();
  const colorName = String(formData.get("colorName") ?? "").trim().slice(0, 50);
  const rawSizes = String(formData.get("sizes") ?? "");
  const sizes = parseSizes(rawSizes);

  if (!colorName) {
    redirect(withNotice("/admin/product", "অনুগ্রহ করে রঙের নাম লিখুন", "error"));
  }

  const files = [
    ...(formData.getAll("imageFiles") as File[]),
    ...(formData.getAll("imageFile") as File[])
  ];

  const uploadedUrls = await saveUploadedFiles(files);

  data.variants.push({
    colorName,
    sizes: sizes.length > 0 ? sizes : ["M", "L", "XL"],
    images: uploadedUrls
  });

  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", `নতুন কালার "${colorName}" যুক্ত হয়েছে`));
}

export async function updateVariantData(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? -1);
  if (variantIndex < 0 || !data.variants[variantIndex]) {
    redirect(withNotice("/admin/product", "ভ্যারিয়েন্ট পাওয়া যায়নি", "error"));
  }

  const colorName = String(formData.get("colorName") ?? "").trim().slice(0, 50);
  const rawSizes = String(formData.get("sizes") ?? "");
  const sizes = parseSizes(rawSizes);

  if (colorName) {
    data.variants[variantIndex].colorName = colorName;
  }
  if (sizes.length > 0) {
    data.variants[variantIndex].sizes = sizes;
  }

  const files = [
    ...(formData.getAll("imageFiles") as File[]),
    ...(formData.getAll("imageFile") as File[])
  ];

  if (files.length > 0) {
    const uploadedUrls = await saveUploadedFiles(files);
    data.variants[variantIndex].images.push(...uploadedUrls);
  }

  await writeProductData(data);
  revalidateAdminPaths();
  redirect(withNotice("/admin/product", "ভ্যারিয়েন্ট সেভ হয়েছে"));
}

export async function addVariant() {
  const data = await readProductData();
  data.variants.push({
    colorName: `Color ${data.variants.length + 1}`,
    sizes: ["M", "L", "XL"],
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
  if (data.variants.length <= 1) {
    redirect(withNotice("/admin/product", "কমপক্ষে ১টি কালার ভ্যারিয়েন্ট থাকতে হবে", "error"));
  }

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

export async function uploadVariantImage(formData: FormData) {
  const data = await readProductData();
  const variantIndex = Number(formData.get("variantIndex") ?? -1);
  if (variantIndex < 0 || variantIndex >= data.variants.length) return;

  const files = [
    ...(formData.getAll("imageFiles") as File[]),
    ...(formData.getAll("imageFile") as File[])
  ];

  const uploadedUrls = await saveUploadedFiles(files);
  if (uploadedUrls.length > 0) {
    data.variants[variantIndex].images.push(...uploadedUrls);
    await writeProductData(data);
    revalidateAdminPaths();
  }

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
