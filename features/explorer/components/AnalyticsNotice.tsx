"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { messages } from "../i18n";
import type { Locale } from "../i18n";
import { dismissAnalyticsNotice, shouldShowAnalyticsNotice } from "../services/analyticsNotice";
import { trapDialogTabKey } from "../services/modalFocus";

export function AnalyticsNotice({ locale }: { locale: Locale }) {
  const text = messages[locale];
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeNotice = useCallback(() => {
    dismissAnalyticsNotice(getLocalStorage());
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!shouldShowAnalyticsNotice(getLocalStorage())) return;

    const frame = window.requestAnimationFrame(() => setIsOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const document = dialog.ownerDocument;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNotice();
        return;
      }
      trapDialogTabKey(event, dialog);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [closeNotice, isOpen]);

  return (
    <>
      <button className="analytics-info-button" type="button" onClick={() => setIsOpen(true)}>
        {text.analyticsInfoButton}
      </button>
      {isOpen && (
        <div
          className="settings-backdrop"
          data-modal-root
          onMouseDown={(event) => event.target === event.currentTarget && closeNotice()}
        >
          <section
            ref={dialogRef}
            className="settings-dialog analytics-notice-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-notice-title"
            aria-describedby="analytics-notice-description"
            tabIndex={-1}
          >
            <div className="settings-head">
              <div>
                <h2 id="analytics-notice-title">{text.analyticsNoticeTitle}</h2>
                <p id="analytics-notice-description">{text.analyticsNoticeDescription}</p>
              </div>
              <button
                ref={closeButtonRef}
                className="settings-close"
                type="button"
                onClick={closeNotice}
                aria-label={text.closeAnalyticsNotice}
              >
                ×
              </button>
            </div>
            <div className="settings-body analytics-notice-body">
              <p>{text.analyticsNoticeDetails}</p>
            </div>
            <div className="settings-footer">
              <button className="button primary" type="button" onClick={closeNotice}>
                {text.closeAnalyticsNotice}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
