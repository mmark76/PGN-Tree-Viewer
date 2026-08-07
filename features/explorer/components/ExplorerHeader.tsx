type ExplorerHeaderProps = {
  sourceLabel: string;
  importing: boolean;
};

export function ExplorerHeader({ sourceLabel, importing }: ExplorerHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">♘</div>
        <div>
          <h1>PGN Tree Viewer</h1>
          <p>{sourceLabel}</p>
        </div>
      </div>
      <div className="top-actions">
        <label className={`button primary upload-label${importing ? " disabled" : ""}`} htmlFor="pgn-file">
          <span aria-hidden="true">↑&nbsp;</span>
          <span className="button-label">{importing ? "Ανάγνωση αρχείου…" : "Εισαγωγή PGN"}</span>
        </label>
      </div>
    </header>
  );
}
