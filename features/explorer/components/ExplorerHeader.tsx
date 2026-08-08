import { messages } from "../i18n";
import type { Locale } from "../i18n";

type ExplorerHeaderProps = {
  sourceLabel: string;
  importing: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function ExplorerHeader({ sourceLabel, importing, locale, onLocaleChange }: ExplorerHeaderProps) {
  const text = messages[locale];

  return (
    <header className="site-header" id="top">
      <div className="header-main">
        <div className="header-brand">
          <p className="header-eyebrow">{text.eyebrow}</p>
          <div className="header-title-row">
            <div className="brand-mark" aria-hidden="true">♘</div>
            <div>
              <h1>PGN Tree Viewer</h1>
              <p className="header-source">{sourceLabel}</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <span className="local-badge"><span aria-hidden="true" /> {text.localPgn}</span>
          <div className="language-switch" aria-label={text.language}>
            <button className={locale === "el" ? "active" : ""} type="button" aria-pressed={locale === "el"} onClick={() => onLocaleChange("el")}>GR</button>
            <button className={locale === "en" ? "active" : ""} type="button" aria-pressed={locale === "en"} onClick={() => onLocaleChange("en")}>EN</button>
          </div>
          <label className={`button primary upload-label${importing ? " disabled" : ""}`} htmlFor="pgn-file">
            <span aria-hidden="true">↑</span>
            <span>{importing ? text.reading : text.importPgn}</span>
          </label>
          <a className="ecosystem-link" href="https://markellosecosystem.com/">
            {text.backToEcosystem}
          </a>
        </div>
      </div>

      <nav className="primary-nav" aria-label={text.mainNavigation}>
        <a className="active" href="#top">{text.home}</a>
        <a href="#move-tree">{text.moveTree}</a>
        <a href="#position-board">{text.board}</a>
      </nav>
    </header>
  );
}
