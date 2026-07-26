"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";

interface LinkSummary {
  linkId: string;
  folderPath: string;
  allowDownload: boolean;
  label?: string;
  createdAt: string;
  expiresAt?: string;
  revoked: boolean;
}

type Status = "loading" | "login" | "dashboard";

export default function AdminPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [links, setLinks] = useState<LinkSummary[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadLinks = useCallback(async () => {
    const res = await fetch("/api/admin/links");
    if (res.status === 401) {
      setStatus("login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links);
      setStatus("dashboard");
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  return (
    <>
      <Header tag="Admin" />
      <main className="page wrap">
        {status === "loading" && <p className="mono">Loading…</p>}
        {status === "login" && <LoginForm onSuccess={loadLinks} />}
        {status === "dashboard" && (
          <Dashboard links={links} origin={origin} onChange={loadLinks} />
        )}
      </main>
    </>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (res.ok) {
      setPassword("");
      onSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <>
      <p className="page-tag">Dreamhouse</p>
      <h1 className="page-title">Admin login</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
        <label className="field">
          Password
          <input
            type="password"
            name="admin-password"
            autoComplete="current-password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </label>
        <button type="submit" className="btn accent" disabled={submitting}>
          {submitting ? "Checking…" : "Log in"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </>
  );
}

function Dashboard({
  links,
  origin,
  onChange,
}: {
  links: LinkSummary[];
  origin: string;
  onChange: () => void;
}) {
  return (
    <>
      <p className="page-tag">Dreamhouse</p>
      <h1 className="page-title">Link admin</h1>

      <CreateLinkForm origin={origin} onCreated={onChange} />

      <h2
        className="mono"
        style={{
          margin: "40px 0 16px",
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
        }}
      >
        Existing links
      </h2>
      {links.length === 0 ? (
        <p className="file-empty-note">No links yet.</p>
      ) : (
        <div className="link-list">
          {links.map((link) => (
            <LinkRow key={link.linkId} link={link} origin={origin} onChange={onChange} />
          ))}
        </div>
      )}
    </>
  );
}

function CreateLinkForm({
  origin,
  onCreated,
}: {
  origin: string;
  onCreated: () => void;
}) {
  const [folderPath, setFolderPath] = useState("");
  const [password, setPassword] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setCreatedUrl("");
    const res = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath, password, allowDownload, label }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setCreatedUrl(`${origin}${data.path}`);
      setFolderPath("");
      setPassword("");
      setAllowDownload(false);
      setLabel("");
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480 }}>
      <label className="field">
        Dropbox folder (blank = whole App folder)
        <input
          className="field-input"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="e.g. Sony A&R"
        />
      </label>
      <label className="field">
        Link password
        <input
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password for this recipient"
        />
      </label>
      <label className="field">
        Note / label
        <input
          className="field-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Sony A&R"
        />
      </label>
      <label className="field field-checkbox" style={{ marginBottom: 22 }}>
        <input
          type="checkbox"
          checked={allowDownload}
          onChange={(e) => setAllowDownload(e.target.checked)}
        />
        Allow downloads (off = preview/listen only)
      </label>
      <button type="submit" className="btn accent" disabled={submitting}>
        {submitting ? "Creating…" : "Create link"}
      </button>
      {error && <p className="error-text">{error}</p>}
      {createdUrl && (
        <div style={{ marginTop: 18 }}>
          <p className="field" style={{ marginBottom: 8 }}>
            Link created
          </p>
          <input
            readOnly
            className="field-input"
            value={createdUrl}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </form>
  );
}

function LinkRow({
  link,
  origin,
  onChange,
}: {
  link: LinkSummary;
  origin: string;
  onChange: () => void;
}) {
  const [working, setWorking] = useState(false);

  async function handleAction() {
    if (link.revoked) {
      const confirmed = window.confirm(
        `Permanently remove "${link.label || link.linkId}" from the list? This can't be undone.`
      );
      if (!confirmed) return;
    }
    setWorking(true);
    await fetch(`/api/admin/links/${link.linkId}`, { method: "DELETE" });
    setWorking(false);
    onChange();
  }

  return (
    <div className={`link-row${link.revoked ? " revoked" : ""}`}>
      <div>
        <div className="link-row-label">{link.label || link.linkId}</div>
        <div className="link-row-meta">
          {origin}/s/{link.linkId} — {link.allowDownload ? "download allowed" : "view only"}
          {link.revoked ? " — revoked" : ""}
        </div>
      </div>
      <button className="btn outline small" onClick={handleAction} disabled={working}>
        {working ? "…" : link.revoked ? "Remove" : "Revoke"}
      </button>
    </div>
  );
}
