"use client";

import { useRef } from "react";
import type { RefObject } from "react";
import { messages } from "../i18n";
import type { Locale } from "../i18n";
import { useModalFocus } from "../services/modalFocus";

export type DownloadFormat = "pgn" | "json" | "svg";

type DownloadPanelProps = {
  locale: Locale;
  onDownload: (format: DownloadFormat) => void;
  onClose: () => void;
};

export function DownloadPanel({ locale, onDownload, onClose }: DownloadPanelProps) {
  const text = messages[locale];
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  useModalFocus({ dialogRef, initialFocusRef, onClose });

  const chooseFormat = (format: DownloadFormat) => {
    onDownload(format);
    onClose();
  };

  return (
    <div
      className="settings-backdrop"
      data-modal-root
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="settings-dialog download-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-title"
        aria-describedby="download-description"
        tabIndex={-1}
      >
        <div className="settings-head">
          <div>
            <h2 id="download-title">{text.downloadTree}</h2>
            <p id="download-description">{text.downloadDescription}</p>
          </div>
          <button className="settings-close" type="button" onClick={onClose} aria-label={text.closeDownload}>×</button>
        </div>
        <div className="download-options">
          <DownloadOption
            buttonRef={initialFocusRef}
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
  buttonRef?: RefObject<HTMLButtonElement | null>;
  badge: string;
  title: string;
  description: string;
  onClick: () => void;
};

function DownloadOption({ buttonRef, badge, title, description, onClick }: DownloadOptionProps) {
  return (
    <button ref={buttonRef} className="download-option" type="button" onClick={onClick}>
      <span className="download-badge" aria-hidden="true">{badge}</span>
      <span className="download-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="download-arrow" aria-hidden="true">↓</span>
    </button>
  );
}
