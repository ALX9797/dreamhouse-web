export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getLink } from "@/lib/kv";
import { verifySessionToken, sessionCookieName } from "@/lib/session";
import { downloadFileRange, guessContentType } from "@/lib/dropbox";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;

  const token = req.cookies.get(sessionCookieName(linkId))?.value;
  if (!token || !(await verifySessionToken(token, linkId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const link = await getLink(linkId);
  if (!link || link.revoked) {
    return NextResponse.json(
      { error: "This link is no longer available." },
      { status: 404 }
    );
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  const wantsDownload = url.searchParams.get("download") === "1";

  if (!path || !path.toLowerCase().startsWith(link.folderPath.toLowerCase())) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }
  if (wantsDownload && !link.allowDownload) {
    return NextResponse.json(
      { error: "Downloads are disabled for this link." },
      { status: 403 }
    );
  }

  try {
    const rangeHeader = req.headers.get("range");
    const file = await downloadFileRange(path, rangeHeader);

    const headers = new Headers();
    headers.set("Content-Type", guessContentType(file.name));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(file.buffer.length));
    headers.set(
      "Content-Disposition",
      `${wantsDownload ? "attachment" : "inline"}; filename="${file.name.replace(/"/g, "")}"`
    );
    headers.set("Cache-Control", "private, no-store");
    if (file.contentRange) {
      headers.set("Content-Range", file.contentRange);
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: file.status,
      headers,
    });
  } catch (err) {
    console.error("Failed to download from Dropbox", err);
    return NextResponse.json(
      { error: "Could not load this file right now." },
      { status: 502 }
    );
  }
}
