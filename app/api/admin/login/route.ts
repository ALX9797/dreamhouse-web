export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { recordAttempt } from "@/lib/kv";
import { createAdminToken, ADMIN_COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const attempts = await recordAttempt("admin", ip);
  if (attempts > 8) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

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

  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminHash) {
    console.error("ADMIN_PASSWORD_HASH is not set.");
    return NextResponse.json(
      { error: "Admin login is not configured yet." },
      { status: 500 }
    );
  }

  const valid = await bcrypt.compare(body.password, adminHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
