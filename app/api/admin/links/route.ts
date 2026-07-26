export const runtime = "nodejs";

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { listLinks, saveLink, LinkRecord } from "@/lib/kv";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "@/lib/session";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const links = await listLinks();
  // Never send password hashes back to the browser.
  const safeLinks = links.map(({ passwordHash: _passwordHash, ...rest }) => rest);
  return NextResponse.json({ links: safeLinks });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: {
    folderPath?: unknown;
    password?: unknown;
    allowDownload?: unknown;
    label?: unknown;
    expiresAt?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 }
    );
  }

  const rawFolderPath =
    typeof body.folderPath === "string" ? body.folderPath.trim() : "";
  const folderPath = rawFolderPath
    ? rawFolderPath.startsWith("/")
      ? rawFolderPath
      : `/${rawFolderPath}`
    : "";

  const linkId = crypto.randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(body.password, 10);

  const link: LinkRecord = {
    linkId,
    folderPath,
    passwordHash,
    allowDownload: Boolean(body.allowDownload),
    label: typeof body.label === "string" && body.label ? body.label : undefined,
    createdAt: new Date().toISOString(),
    expiresAt:
      typeof body.expiresAt === "string" && body.expiresAt
        ? body.expiresAt
        : undefined,
    revoked: false,
  };

  await saveLink(link);

  return NextResponse.json({
    link: { ...link, passwordHash: undefined },
    path: `/s/${linkId}`,
  });
}
