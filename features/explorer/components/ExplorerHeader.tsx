import { messages } from "../i18n";
import type { Locale } from "../i18n";

type ExplorerHeaderProps = {
  sourceLabel: string;
  importing: boolean;
  importProgress: number;
  importProgressLabel: string;
  locale: Locale;
  downloadDisabled: boolean;
  onLocaleChange: (locale: Locale) => void;
  onCancelImport: () => void;
  onOpenDownload: () => void;
  onOpenSan: () => void;
  onOpenSettings: () => void;
};

export function ExplorerHeader({
  sourceLabel,
  importing,
  importProgress,
  importProgressLabel,
  locale,
  downloadDisabled,
  onLocaleChange,
  onCancelImport,
  onOpenDownload,
  onOpenSan,
  onOpenSettings,
}: ExplorerHeaderProps) {
  const text = messages[locale];

  return (
    <header className="site-header" id="top">
      <div className="header-main">
        <div className="header-brand">
          <p className="header-eyebrow">{text.eyebrow}</p>
          <div className="header-title-row">
            <div className="brand-mark" aria-hidden="true">♘</div>
            <div>
              <h1>Chess Tree Builder</h1>
              <p className="header-source">{sourceLabel}</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <span className="local-badge"><span aria-hidden="true" /> {text.localPgn}</span>
          <button className="button settings-button" type="button" onClick={onOpenSettings} disabled={importing}>
            <span aria-hidden="true">⚙</span>
            {text.settings}
          </button>
          <button className="button san-button" type="button" onClick={onOpenSan} disabled={importing}>
            <span aria-hidden="true">▣</span>
            {text.pasteSan}
          </button>
          <button className="button download-button" type="button" disabled={downloadDisabled} onClick={onOpenDownload}>
            <span aria-hidden="true">↓</span>
            {text.downloadTree}
          </button>
          <div className="language-switch" aria-label={text.language}>
            <button className={locale === "el" ? "active" : ""} type="button" aria-pressed={locale === "el"} onClick={() => onLocaleChange("el")}>GR</button>
            <button className={locale === "en" ? "active" : ""} type="button" aria-pressed={locale === "en"} onClick={() => onLocaleChange("en")}>EN</button>
          </div>
          {importing ? (
            <div className="import-status">
              <span className="import-progress-label">{importProgressLabel}</span>
              <progress
                className="import-progress"
                max="100"
                value={importProgress}
                aria-label={importProgressLabel}
              />
              <button className="button import-cancel" type="button" onClick={onCancelImport}>
                {text.cancelImport}
              </button>
            </div>
          ) : (
            <label className="button primary upload-label" htmlFor="tree-file">
              <span aria-hidden="true">↑</span>
              <span>{text.importPgn}</span>
            </label>
          )}
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
