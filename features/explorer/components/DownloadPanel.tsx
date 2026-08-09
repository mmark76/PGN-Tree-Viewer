"use client";

import { useEffect } from "react";
import { messages } from "../i18n";
import type { Locale } from "../i18n";

export type DownloadFormat = "pgn" | "json" | "svg";

type DownloadPanelProps = {
  locale: Locale;
  onDownload: (format: DownloadFormat) => void;
  onClose: () => void;
};

export function DownloadPanel({ locale, onDownload, onClose }: DownloadPanelProps) {
  const text = messages[locale];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const chooseFormat = (format: DownloadFormat) => {
    onDownload(format);
    onClose();
  };

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog download-dialog" role="dialog" aria-modal="true" aria-labelledby="download-title">
        <div className="settings-head">
          <div>
            <h2 id="download-title">{text.downloadTree}</h2>
            <p>{text.downloadDescription}</p>
          </div>
          <button className="settings-close" type="button" onClick={onClose} aria-label={text.closeDownload}>×</button>
        </div>
        <div className="download-options">
          <DownloadOption
            badge="PGN"
            title={text.downloadPgn}
            description={text.downloadPgnDescription}
            onClick={() => chooseFormat("pgn")}
          />
          <DownloadOption
            badge="JSON"
            title={text.downloadJson}
            description={text.downloadJsonDescription}
            onClick={() => chooseFormat("json")}
          />
          <DownloadOption
            badge="SVG"
            title={text.downloadSvg}
            description={text.downloadSvgDescription}
            onClick={() => chooseFormat("svg")}
          />
        </div>
      </section>
    </div>
  );
}

type DownloadOptionProps = {
  badge: string;
  title: string;
  description: string;
  onClick: () => void;
};

function DownloadOption({ badge, title, description, onClick }: DownloadOptionProps) {
  return (
    <button className="download-option" type="button" onClick={onClick}>
      <span className="download-badge" aria-hidden="true">{badge}</span>
      <span className="download-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="download-arrow" aria-hidden="true">↓</span>
    </button>
  );
}
