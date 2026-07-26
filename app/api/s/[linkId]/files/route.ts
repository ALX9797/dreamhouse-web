export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getLink } from "@/lib/kv";
import { verifySessionToken, sessionCookieName } from "@/lib/session";
import { listFolderFiles } from "@/lib/dropbox";

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
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "This link is no longer available." },
      { status: 404 }
    );
  }

  try {
    const files = await listFolderFiles(link.folderPath);
    return NextResponse.json({ files, allowDownload: link.allowDownload });
  } catch (err) {
    console.error("Failed to list Dropbox folder", err);
    return NextResponse.json(
      { error: "Could not load files right now." },
      { status: 502 }
    );
  }
}
