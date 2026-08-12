import { messages } from "../i18n";
import type { Locale } from "../i18n";

type ExplorerHeaderProps = {
  importing: boolean;
  importProgress: number;
  importProgressLabel: string;
  locale: Locale;
  downloadDisabled: boolean;
  uploadDisabled: boolean;
  onLocaleChange: (locale: Locale) => void;
  onCancelImport: () => void;
  onOpenFilePicker: () => void;
  onOpenDownload: () => void;
  onOpenSan: () => void;
  onOpenSettings: () => void;
};

export function ExplorerHeader({
  importing,
  importProgress,
  importProgressLabel,
  locale,
  downloadDisabled,
  uploadDisabled,
  onLocaleChange,
  onCancelImport,
  onOpenFilePicker,
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
            <h1>Chess Tree Builder</h1>
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
            <button
              className="button primary upload-label"
              type="button"
              disabled={uploadDisabled}
              onClick={onOpenFilePicker}
            >
              <span aria-hidden="true">↑</span>
              <span>{text.importPgn}</span>
            </button>
          )}
          <a className="ecosystem-link" href="https://markellosecosystem.com/">
            {text.backToEcosystem}
          </a>
        </div>
      </div>

    </header>
  );
}
