export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getLink, revokeLink, deleteLink } from "@/lib/kv";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "@/lib/session";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

// First DELETE on an active link revokes it (soft — link stays listed,
// marked revoked). A second DELETE on an already-revoked link permanently
// removes it from the list.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { linkId } = await params;
  const link = await getLink(linkId);
  if (!link) {
    return NextResponse.json({ ok: true });
  }
  if (link.revoked) {
    await deleteLink(linkId);
  } else {
    await revokeLink(linkId);
  }
  return NextResponse.json({ ok: true });
}
