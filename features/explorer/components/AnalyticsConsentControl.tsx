"use client";

import { useEffect, useState } from "react";
import { messages } from "../i18n";
import type { Locale } from "../i18n";
import {
  initializeAnalytics,
  readAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "../services/analyticsConsent";

export function AnalyticsConsentControl({ locale }: { locale: Locale }) {
  const text = messages[locale];
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [consent, setConsentState] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    initializeAnalytics();
    const stored = readAnalyticsConsent();
    setConsentState(stored);
    setOpen(stored === null);
    setReady(true);
  }, []);

  const choose = (nextConsent: AnalyticsConsent) => {
    setAnalyticsConsent(nextConsent);
    setConsentState(nextConsent);
    setOpen(false);
  };

  return (
    <>
      <button
        className="analytics-choice-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        {text.analyticsChoices}
      </button>

      {ready && open ? (
        <aside
          className="analytics-consent"
          role="dialog"
          aria-labelledby="analytics-consent-title"
        >
          <div>
            <h2 id="analytics-consent-title">{text.analyticsTitle}</h2>
            <p>{text.analyticsDescription}</p>
          </div>
          <div className="analytics-consent-actions">
            <button type="button" onClick={() => choose("denied")}>
              {text.analyticsNecessary}
            </button>
            <button
              className="analytics-consent-allow"
              type="button"
              onClick={() => choose("granted")}
            >
              {text.analyticsAllow}
            </button>
            {consent !== null ? (
              <button
                className="analytics-consent-close"
                type="button"
                aria-label={text.analyticsClose}
                title={text.analyticsClose}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
