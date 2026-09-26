export type AnalyticsConsent = "granted" | "denied";

export const GA4_MEASUREMENT_ID = "G-DK5WN8TH3Z";
export const ANALYTICS_CONSENT_STORAGE_KEY = "chesstree.analyticsConsent.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const GOOGLE_TAG_SCRIPT_ID = "chesstree-google-tag";
const DENIED_CONSENT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

let configured = false;

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAnalyticsConsent(
  storage: StorageLike | null = browserStorage(),
): AnalyticsConsent | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function persistAnalyticsConsent(
  consent: AnalyticsConsent,
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
    return true;
  } catch {
    return false;
  }
}

function getGtag() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
  return window.gtag;
}

function applyAnalyticsConsent(consent: AnalyticsConsent | null) {
  if (typeof window === "undefined") return;
  getGtag()("consent", "update", {
    ...DENIED_CONSENT,
    analytics_storage: consent === "granted" ? "granted" : "denied",
  });
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  persistAnalyticsConsent(consent);
  applyAnalyticsConsent(consent);
}

export function initializeAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const gtag = getGtag();
  gtag("consent", "default", DENIED_CONSENT);
  applyAnalyticsConsent(readAnalyticsConsent());

  if (!document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  if (configured) return;
  gtag("js", new Date());
  gtag("config", GA4_MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  configured = true;
}
