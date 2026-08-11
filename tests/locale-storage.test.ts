import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_POSITION } from "chess.js";
import { DEFAULT_SETTINGS } from "../features/explorer/settings";
import {
  applyDocumentLocale,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  readStoredLocale,
  storeLocale,
} from "../features/explorer/services/localeStorage";
import { createManualLine } from "../features/explorer/services/manualLines";
import {
  parseChessTreeJson,
  serializeChessTreeJson,
} from "../features/explorer/services/treeFiles";

test("locale storage accepts only supported locales and falls back to English", () => {
  assert.equal(normalizeLocale("el"), "el");
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("el-GR"), "en");
  assert.equal(normalizeLocale("EN"), "en");
  assert.equal(normalizeLocale(null), "en");
});

test("locale storage reads, writes, and survives unavailable browser storage", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let storedValue: string | null = "el";
  const writes: Array<[string, string]> = [];
  const localStorage = {
    getItem(key: string) {
      assert.equal(key, LOCALE_STORAGE_KEY);
      return storedValue;
    },
    setItem(key: string, value: string) {
      writes.push([key, value]);
      storedValue = value;
    },
  };

  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });

    assert.equal(readStoredLocale(), "el");
    storedValue = "fr";
    assert.equal(readStoredLocale(), "en");
    storedValue = null;
    assert.equal(readStoredLocale(), "en");

    storeLocale("el");
    storeLocale("en");
    assert.deepEqual(writes, [
      [LOCALE_STORAGE_KEY, "el"],
      [LOCALE_STORAGE_KEY, "en"],
    ]);

    localStorage.getItem = () => {
      throw new Error("storage blocked");
    };
    localStorage.setItem = () => {
      throw new Error("storage blocked");
    };
    assert.equal(readStoredLocale(), "en");
    assert.doesNotThrow(() => storeLocale("el"));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});

test("document language is normalized and tree JSON never imports or exports locale", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const documentElement = { lang: "" };

  try {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { documentElement },
    });
    applyDocumentLocale("el");
    assert.equal(documentElement.lang, "el");

    const serialized = serializeChessTreeJson(
      [createManualLine(["e4"], DEFAULT_POSITION)],
      DEFAULT_SETTINGS,
      "study.pgn",
    );
    const raw = JSON.parse(serialized) as Record<string, unknown>;
    assert.equal(Object.hasOwn(raw, "locale"), false);

    raw.locale = "el";
    const parsed = parseChessTreeJson(JSON.stringify(raw));
    assert.equal("locale" in parsed, false);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete (globalThis as { document?: unknown }).document;
  }
});
