export function Header({ tag }: { tag?: string }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-logo">Dreamhouse</div>
        {tag && <div className="app-tag mono">{tag}</div>}
      </div>
    </header>
  );
}
