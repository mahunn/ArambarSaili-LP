import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    // Retrieve the blob data. If it is private, get() uses the BLOB_READ_WRITE_TOKEN from the environment automatically.
    const access = process.env.BLOB_JSON_ACCESS === "private" ? "private" : "public";
    const result = await get(url, { access });
    if (!result || !result.stream) {
      return new NextResponse("Blob not found", { status: 404 });
    }

    const headers = new Headers();
    if (result.blob?.contentType) headers.set("Content-Type", result.blob.contentType);
    if (result.blob?.cacheControl) headers.set("Cache-Control", result.blob.cacheControl);

    return new NextResponse(result.stream as any, {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error("[blob-image api] Failed to fetch private blob:", err);
    return new NextResponse("Error fetching blob", { status: 500 });
  }
}
