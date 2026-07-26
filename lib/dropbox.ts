import { Dropbox, DropboxAuth, files } from "dropbox";

function getDropboxAuth(): DropboxAuth {
  return new DropboxAuth({
    clientId: process.env.DROPBOX_APP_KEY!,
    clientSecret: process.env.DROPBOX_APP_SECRET!,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN!,
  });
}

export function getDropboxClient(): Dropbox {
  return new Dropbox({ auth: getDropboxAuth() });
}

export type FileKind = "audio" | "image" | "other";

export interface DropboxFileEntry {
  name: string;
  path: string;
  size: number;
  kind: FileKind;
}

function kindForName(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

export async function listFolderFiles(
  folderPath: string
): Promise<DropboxFileEntry[]> {
  const dbx = getDropboxClient();
  const res = await dbx.filesListFolder({ path: folderPath });
  const entries = res.result.entries as files.MetadataReference[];

  return entries
    .filter((e): e is files.FileMetadataReference => e[".tag"] === "file")
    .map((e) => ({
      name: e.name,
      path: e.path_lower ?? e.path_display ?? `${folderPath}/${e.name}`,
      size: e.size ?? 0,
      kind: kindForName(e.name),
    }));
}

export interface RangedDownload {
  name: string;
  buffer: Buffer;
  status: number; // 200 (full) or 206 (partial)
  contentRange?: string;
  totalSize: number;
}

// Bypasses the SDK's filesDownload() (which only ever fetches the whole file)
// and talks to Dropbox's content endpoint directly so we can forward the
// browser's Range header through. That's what lets <audio> seek instead of
// only ever playing from the start.
export async function downloadFileRange(
  filePath: string,
  range?: string | null
): Promise<RangedDownload> {
  const auth = getDropboxAuth();
  await auth.checkAndRefreshAccessToken();
  const accessToken = auth.getAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
  };
  if (range) {
    headers.Range = range;
  }

  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dropbox download failed (${res.status}): ${text}`);
  }

  const apiResultHeader = res.headers.get("dropbox-api-result");
  let meta: { name?: string; size?: number } = {};
  if (apiResultHeader) {
    try {
      meta = JSON.parse(apiResultHeader);
    } catch {
      // Ignore malformed metadata header; fall back to defaults below.
    }
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentRange = res.headers.get("content-range") ?? undefined;
  const totalSize =
    meta.size ??
    (contentRange ? Number(contentRange.split("/")[1]) : buffer.length);

  return {
    name: meta.name ?? filePath.split("/").pop() ?? "file",
    buffer,
    status: res.status,
    contentRange,
    totalSize,
  };
}

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function guessContentType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}
