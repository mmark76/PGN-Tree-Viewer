import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  GA4_MEASUREMENT_ID,
  persistAnalyticsConsent,
  readAnalyticsConsent,
} from "../features/explorer/services/analyticsConsent";

class MemoryStorage {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

test("GA4 consent persists and reads valid choices", () => {
  const storage = new MemoryStorage();

  assert.equal(GA4_MEASUREMENT_ID, "G-DK5WN8TH3Z");
  assert.equal(readAnalyticsConsent(storage), null);

  assert.equal(persistAnalyticsConsent("granted", storage), true);
  assert.equal(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY), "granted");
  assert.equal(readAnalyticsConsent(storage), "granted");

  assert.equal(persistAnalyticsConsent("denied", storage), true);
  assert.equal(readAnalyticsConsent(storage), "denied");

  storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "invalid");
  assert.equal(readAnalyticsConsent(storage), null);
});
