export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getLink, recordAttempt } from "@/lib/kv";
import { createSessionToken, sessionCookieName } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const attempts = await recordAttempt(linkId, ip);
  if (attempts > 8) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  // Small deliberate delay to slow down brute-force guessing further.
  await new Promise((resolve) => setTimeout(resolve, 400));

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json({ error: "Password required." }, { status: 400 });
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

  const valid = await bcrypt.compare(body.password, link.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken(linkId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(linkId), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/`,
    maxAge: 60 * 60 * 12,
  });
  return res;
}
