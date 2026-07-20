/**
 * Formats an image URL to bypass private store access controls by routing it
 * through our server-side API proxy when necessary.
 */
export function getDisplayImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  // Check if it's a vercel storage URL
  if (url.includes("vercel-storage.com")) {
    return `/api/blob-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
