import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface LinkRecord {
  linkId: string;
  folderPath: string; // Dropbox path, e.g. "/Sony A&R teaser"
  passwordHash: string;
  allowDownload: boolean;
  label?: string;
  createdAt: string;
  expiresAt?: string;
  revoked: boolean;
}

const LINK_IDS_SET = "link-ids";

export async function getLink(linkId: string): Promise<LinkRecord | null> {
  const data = await redis.get<LinkRecord>(`link:${linkId}`);
  return data ?? null;
}

export async function saveLink(link: LinkRecord): Promise<void> {
  await redis.set(`link:${link.linkId}`, link);
  await redis.sadd(LINK_IDS_SET, link.linkId);
}

export async function revokeLink(linkId: string): Promise<void> {
  const link = await getLink(linkId);
  if (!link) return;
  link.revoked = true;
  await redis.set(`link:${linkId}`, link);
}

// Permanently removes a link record. Used to clear out already-revoked
// links from the admin list; not exposed for active links.
export async function deleteLink(linkId: string): Promise<void> {
  await redis.del(`link:${linkId}`);
  await redis.srem(LINK_IDS_SET, linkId);
}

export async function listLinks(): Promise<LinkRecord[]> {
  const ids = await redis.smembers(LINK_IDS_SET);
  if (!ids.length) return [];
  const links = await Promise.all(ids.map((id) => getLink(id)));
  return links
    .filter((l): l is LinkRecord => l !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Simple brute-force slowdown: counts attempts per link+ip in a rolling 60s window.
export async function recordAttempt(linkId: string, ip: string): Promise<number> {
  const key = `attempts:${linkId}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  return count;
}
