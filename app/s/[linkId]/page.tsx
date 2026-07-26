"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";

interface FileEntry {
  name: string;
  path: string;
  size: number;
  kind: "audio" | "image" | "other";
}

type Status = "loading" | "locked" | "unlocked" | "gone";

export default function SharePage() {
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;

  const [status, setStatus] = useState<Status>("loading");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [allowDownload, setAllowDownload] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFiles = useCallback(async () => {
    const res = await fetch(`/api/s/${linkId}/files`);
    if (res.status === 401) {
      setStatus("locked");
      return;
    }
    if (!res.ok) {
      setStatus("gone");
      return;
    }
    const data = await res.json();
    setFiles(data.files);
    setAllowDownload(data.allowDownload);
    setStatus("unlocked");
  }, [linkId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/s/${linkId}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (res.ok) {
      setPassword("");
      loadFiles();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <>
      <Header tag="Private Listening" />
      <main className="page wrap">
        {status === "loading" && <p className="mono">Loading…</p>}

        {status === "gone" && (
          <>
            <p className="page-tag">Dreamhouse</p>
            <h1 className="page-title">Link unavailable</h1>
            <p style={{ color: "var(--muted)" }}>
              This link is no longer available.
            </p>
          </>
        )}

        {status === "locked" && (
          <>
            <p className="page-tag">Private listening</p>
            <h1 className="page-title">Enter password</h1>
            <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
              <label className="field">
                Password
                <input
                  type="password"
                  name="link-password"
                  autoComplete="new-password"
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </label>
              <button type="submit" className="btn accent" disabled={submitting}>
                {submitting ? "Checking…" : "Enter"}
              </button>
              {error && <p className="error-text">{error}</p>}
            </form>
          </>
        )}

        {status === "unlocked" && (
          <>
            <p className="page-tag">Private listening</p>
            <h1 className="page-title">Dreamhouse files</h1>
            {files.length === 0 ? (
              <p className="file-empty-note">No files in this folder yet.</p>
            ) : (
              <div className="file-list">
                {files.map((f) => (
                  <FileRow
                    key={f.path}
                    file={f}
                    linkId={linkId}
                    allowDownload={allowDownload}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function FileRow({
  file,
  linkId,
  allowDownload,
}: {
  file: FileEntry;
  linkId: string;
  allowDownload: boolean;
}) {
  const viewUrl = `/api/s/${linkId}/download?path=${encodeURIComponent(file.path)}`;
  const downloadUrl = `${viewUrl}&download=1`;

  return (
    <div className="file-row">
      <div className="file-row-head">
        <span className="file-name">{file.name}</span>
        {allowDownload && (
          <a className="btn outline small" href={downloadUrl}>
            Download
          </a>
        )}
      </div>
      {file.kind === "audio" && (
        <audio controls src={viewUrl} className="file-media" />
      )}
      {file.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={viewUrl} alt={file.name} className="file-media" />
      )}
      {file.kind === "other" && (
        <p className="file-empty-note">Preview not available for this file type.</p>
      )}
    </div>
  );
}
