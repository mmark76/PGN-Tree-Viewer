import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_NOTICE_STORAGE_KEY,
  dismissAnalyticsNotice,
  shouldShowAnalyticsNotice,
} from "../features/explorer/services/analyticsNotice";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("first visit shows the analytics information notice", () => {
  assert.equal(shouldShowAnalyticsNotice(new MemoryStorage()), true);
});

test("closing persists dismissal across reloads", () => {
  const storage = new MemoryStorage();

  assert.equal(dismissAnalyticsNotice(storage), true);
  assert.equal(storage.getItem(ANALYTICS_NOTICE_STORAGE_KEY), "true");
  assert.equal(shouldShowAnalyticsNotice(storage), false);
});

test("unavailable storage degrades without blocking the notice", () => {
  const unavailableStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };

  assert.equal(shouldShowAnalyticsNotice(unavailableStorage), true);
  assert.equal(dismissAnalyticsNotice(unavailableStorage), false);
});
