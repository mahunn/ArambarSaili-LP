import { get, put } from "@vercel/blob";

/** Pathnames are stable keys in your Blob store (not public URLs). */
export const PRODUCT_JSON_BLOB_PATH = "arambarsaili/product.json";
export const ORDERS_JSON_BLOB_PATH = "arambarsaili/orders.json";

/** In-memory store for instant read-after-write consistency within the process. */
const memoryCache = new Map<string, { content: string; timestamp: number }>();

export function useBlobJsonPersistence(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** `private` if your Blob store only allows private objects; default `public` for server-only JSON. */
function blobJsonAccess(): "public" | "private" {
  return process.env.BLOB_JSON_ACCESS === "private" ? "private" : "public";
}

function getStoreIdFromToken(token: string): string {
  const parts = token.split("_");
  return parts[3] || "";
}

export async function readTextBlob(pathname: string): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  
  if (token) {
    const accessList: Array<"public" | "private"> =
      blobJsonAccess() === "private" ? ["private", "public"] : ["public", "private"];

    const storeId = getStoreIdFromToken(token);

    if (storeId) {
      for (const access of accessList) {
        try {
          const fetchUrl = `https://${storeId}.${access}.blob.vercel-storage.com/${pathname}?t=${Date.now()}`;
          const res = await fetch(fetchUrl, {
            method: "GET",
            headers: {
              authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache"
            },
            cache: "no-store",
            next: { revalidate: 0 }
          });

          if (res.ok) {
            const text = await res.text();
            memoryCache.set(pathname, { content: text, timestamp: Date.now() });
            return text;
          }
        } catch (err) {
          console.warn(`[vercel-blob-json] Direct fetch (${access}) failed for "${pathname}":`, err);
        }
      }
    }
  }

  // Fallback 1: Use @vercel/blob SDK get with no-cache headers
  try {
    const access = blobJsonAccess();
    const result = await get(pathname, {
      access,
      useCache: false,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache"
      }
    });

    if (result && result.statusCode === 200 && result.stream) {
      const text = await new Response(result.stream).text();
      memoryCache.set(pathname, { content: text, timestamp: Date.now() });
      return text;
    }
  } catch (err) {
    console.warn(`[vercel-blob-json] SDK get failed for "${pathname}":`, err);
  }

  // Fallback 2: Return in-memory cache if network fetch failed
  const cached = memoryCache.get(pathname);
  if (cached) {
    return cached.content;
  }

  return null;
}

export async function writeTextBlob(pathname: string, body: string): Promise<void> {
  // Update in-memory cache immediately for read-after-write consistency
  memoryCache.set(pathname, { content: body, timestamp: Date.now() });

  const access = blobJsonAccess();
  try {
    await put(pathname, body, {
      access,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 0
    });
  } catch (err: any) {
    const msg = err?.message?.toLowerCase() ?? "";
    if (access === "public" && (msg.includes("private") || msg.includes("read access"))) {
      console.warn(`[vercel-blob-json] Public access failed on private store, retrying with private access for "${pathname}".`);
      await put(pathname, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 0
      });
      return;
    }
    throw err;
  }
}
