export function ExplorerFooter() {
  return (
    <footer className="site-footer">
      <div className="privacy-strip">
        <span aria-hidden="true">ⓘ</span>
        <p>
          Τα αρχεία PGN αναλύονται τοπικά σε αυτό το πρόγραμμα περιήγησης και δεν μεταφορτώνονται σε διακομιστή.
        </p>
      </div>
      <div className="footer-main">
        <p>© 2026 Markellos Markides. All rights reserved.</p>
        <nav aria-label="Σύνδεσμοι υποσέλιδου">
          <a href="https://github.com/mmark76/PGN-Tree-Viewer">GitHub</a>
          <a href="https://github.com/mmark76/PGN-Tree-Viewer/blob/main/LICENSE">Άδεια MIT</a>
          <a href="https://markellosecosystem.com/">Markellos Ecosystem</a>
        </nav>
        <small>ChessTree · v0.2</small>
      </div>
    </footer>
  );
}
