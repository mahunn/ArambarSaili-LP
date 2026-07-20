/**
 * Formats an image URL to bypass private store access controls by routing it
 * through our server-side API proxy when necessary.
 */
export function getDisplayImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  // Route through proxy only if store access is explicitly set to private
  if (process.env.BLOB_JSON_ACCESS === "private" && url.includes("vercel-storage.com")) {
    return `/api/blob-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
