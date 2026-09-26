"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { messages } from "../i18n";
import type { Locale } from "../i18n";
import {
  getAnalyticsConsentSnapshot,
  initializeAnalytics,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
} from "../services/analyticsConsent";

export function AnalyticsConsentControl({ locale }: { locale: Locale }) {
  const text = messages[locale];
  const [forceOpen, setForceOpen] = useState(false);
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsentSnapshot,
    () => null,
  );
  const open = forceOpen || consent === null;

  useEffect(() => {
    initializeAnalytics();
  }, []);

  const choose = (nextConsent: AnalyticsConsent) => {
    setAnalyticsConsent(nextConsent);
    setForceOpen(false);
  };

  return (
    <>
      <button
        className="analytics-choice-button"
        type="button"
        onClick={() => setForceOpen(true)}
      >
        {text.analyticsChoices}
      </button>

      {open ? (
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
                onClick={() => setForceOpen(false)}
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
