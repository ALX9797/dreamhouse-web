import { Header } from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header tag="Private Files" />
      <main className="page wrap">
        <p className="page-tag">Dreamhouse</p>
        <h1 className="page-title">Private file sharing.</h1>
        <p style={{ maxWidth: 480, color: "var(--muted)" }}>
          If you&apos;ve been sent a link to hear or view something, open it
          directly — there&apos;s nothing to browse here.
        </p>
      </main>
    </>
  );
}
