import { promises as fs } from "fs";
import path from "path";
import {
  PRODUCT_JSON_BLOB_PATH,
  readTextBlob,
  useBlobJsonPersistence,
  writeTextBlob
} from "@/lib/vercel-blob-json";

export type ProductVariant = {
  colorName: string;
  sizes: string[];
  images: string[];
};

export type ProductFaq = {
  question: string;
  answer: string;
};

export type ProductReview = {
  author: string;
  location: string;
  rating: number;
  text: string;
};

export type ProductData = {
  title: string;
  description: string;
  basePrice: number;
  discountType: "none" | "flat" | "percent";
  discountValue: number;
  whatsappNumber: string;
  callNumber: string;
  variants: ProductVariant[];
  faqs: ProductFaq[];
  reviews: ProductReview[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "product.json");

const defaultData: ProductData = {
  title: "Premium Gown One Piece",
  description: "Soft premium fabric gown with elegant finish.",
  basePrice: 1750,
  discountType: "flat",
  discountValue: 80,
  whatsappNumber: "8801918764460",
  callNumber: "8801918764460",
  variants: [
    {
      colorName: "Navy Blue",
      sizes: ["M", "L", "XL"],
      images: [
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1200&auto=format&fit=crop"
      ]
    },
    {
      colorName: "Olive Green",
      sizes: ["M", "L", "XL"],
      images: [
        "https://images.unsplash.com/photo-1495385794356-15371f348c31?q=80&w=1200&auto=format&fit=crop"
      ]
    }
  ],
  faqs: [
    {
      question: "ডেলিভারি কত দিনে হবে?",
      answer: "ঢাকার ভেতরে ১-২ দিন, ঢাকার বাইরে ২-৪ কার্যদিবস।"
    },
    {
      question: "পেমেন্ট কিভাবে করব?",
      answer: "ক্যাশ অন ডেলিভারি এবং বিকাশ/নগদ উভয় অপশন আছে।"
    }
  ],
  reviews: [
    {
      author: "রিমি",
      location: "ঢাকা",
      rating: 5,
      text: "কাপড়ের কোয়ালিটি খুব ভালো, ছবির মতোই পেয়েছি।"
    },
    {
      author: "মৌ",
      location: "সিলেট",
      rating: 5,
      text: "ফিটিং ও রঙ দারুণ। ডেলিভারি সময়মতো হয়েছে।"
    },
    {
      author: "তৃষা",
      location: "চট্টগ্রাম",
      rating: 4,
      text: "প্যাকেজিং সুন্দর ছিল, সার্ভিসও ভালো।"
    }
  ]
};

function coerceDiscountTypeFromJson(v: unknown): ProductData["discountType"] {
  if (v === "flat" || v === "percent" || v === "none") return v;
  return "none";
}

function normalizeProductData(data: Partial<ProductData>): ProductData {
  return {
    title: data.title ?? defaultData.title,
    description: data.description ?? defaultData.description,
    basePrice: Number(data.basePrice ?? defaultData.basePrice),
    discountType: coerceDiscountTypeFromJson(data.discountType),
    discountValue: Number(data.discountValue ?? defaultData.discountValue),
    whatsappNumber: data.whatsappNumber ?? defaultData.whatsappNumber,
    callNumber: data.callNumber ?? defaultData.callNumber,
    variants: Array.isArray(data.variants) ? data.variants : defaultData.variants,
    faqs: Array.isArray(data.faqs) ? data.faqs : defaultData.faqs,
    reviews: Array.isArray(data.reviews) ? data.reviews : defaultData.reviews
  };
}

export function calculateFinalPrice(data: ProductData): number {
  if (data.discountType === "flat") return Math.max(0, data.basePrice - data.discountValue);
  if (data.discountType === "percent")
    return Math.max(0, data.basePrice - (data.basePrice * data.discountValue) / 100);
  return data.basePrice;
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

async function readProductFromDisk(): Promise<ProductData | null> {
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return normalizeProductData(JSON.parse(content) as Partial<ProductData>);
  } catch {
    return null;
  }
}

export async function readProductData(): Promise<ProductData> {
  if (useBlobJsonPersistence()) {
    const fromBlob = await readTextBlob(PRODUCT_JSON_BLOB_PATH);
    if (fromBlob) {
      try {
        return normalizeProductData(JSON.parse(fromBlob) as Partial<ProductData>);
      } catch {
        // Corrupt blob: fall through to disk / defaults.
      }
    }
    const fromDisk = await readProductFromDisk();
    if (fromDisk) return fromDisk;
    return defaultData;
  }

  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return normalizeProductData(JSON.parse(content) as Partial<ProductData>);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
}

export async function writeProductData(data: ProductData): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  if (useBlobJsonPersistence()) {
    await writeTextBlob(PRODUCT_JSON_BLOB_PATH, json);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Vercel: add BLOB_READ_WRITE_TOKEN (Storage → Blob in the Vercel dashboard). The server filesystem is read-only, so product/FAQ saves require Blob."
    );
  }
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, json, "utf-8");
}
