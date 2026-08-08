type ExplorerHeaderProps = {
  sourceLabel: string;
  importing: boolean;
};

export function ExplorerHeader({ sourceLabel, importing }: ExplorerHeaderProps) {
  return (
    <header className="site-header" id="top">
      <div className="header-main">
        <div className="header-brand">
          <p className="header-eyebrow">YOUR PRIVATE CHESS STUDY SPACE</p>
          <div className="header-title-row">
            <div className="brand-mark" aria-hidden="true">♘</div>
            <div>
              <h1>PGN Tree Viewer</h1>
              <p className="header-source">{sourceLabel}</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <span className="local-badge"><span aria-hidden="true" /> Local PGN</span>
          <span className="language-badge" aria-label="Γλώσσα: Ελληνικά">GR</span>
          <label className={`button primary upload-label${importing ? " disabled" : ""}`} htmlFor="pgn-file">
            <span aria-hidden="true">↑</span>
            <span>{importing ? "Ανάγνωση…" : "Εισαγωγή PGN"}</span>
          </label>
          <a className="ecosystem-link" href="https://markellosecosystem.com/">
            Πίσω στο markellosecosystem
          </a>
        </div>
      </div>

      <nav className="primary-nav" aria-label="Κύρια πλοήγηση">
        <a className="active" href="#top">Αρχική</a>
        <a href="#move-tree">Δέντρο κινήσεων</a>
        <a href="#position-board">Σκακιέρα</a>
      </nav>
    </header>
  );
}
