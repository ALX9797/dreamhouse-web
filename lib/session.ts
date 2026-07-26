import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

// --- Recipient link sessions (scoped to one linkId) ---

export async function createSessionToken(linkId: string): Promise<string> {
  return await new SignJWT({ linkId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
  linkId: string
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.linkId === linkId;
  } catch {
    return false;
  }
}

export function sessionCookieName(linkId: string): string {
  return `dhfs_${linkId}`;
}

// --- Admin session ---

export const ADMIN_COOKIE_NAME = "dh_admin";

export async function createAdminToken(): Promise<string> {
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
