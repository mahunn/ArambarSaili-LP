import { get, put } from "@vercel/blob";

/** Pathnames are stable keys in your Blob store (not public URLs). */
export const PRODUCT_JSON_BLOB_PATH = "arambarsaili/product.json";
export const ORDERS_JSON_BLOB_PATH = "arambarsaili/orders.json";

export function useBlobJsonPersistence(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** `private` if your Blob store only allows private objects; default `public` for server-only JSON. */
function blobJsonAccess(): "public" | "private" {
  return process.env.BLOB_JSON_ACCESS === "private" ? "private" : "public";
}

export async function readTextBlob(pathname: string): Promise<string | null> {
  try {
    const access = blobJsonAccess();
    const result = await get(pathname, { access, useCache: false });
    if (!result || result.statusCode === 304) return null;
    if (!result.stream) return null;
    return await new Response(result.stream).text();
  } catch (err) {
    console.warn(`[vercel-blob-json] Failed to read text blob "${pathname}":`, err);
    return null;
  }
}

export async function writeTextBlob(pathname: string, body: string): Promise<void> {
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
