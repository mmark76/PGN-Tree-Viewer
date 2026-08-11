import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { ExplorerShell } from "../features/explorer/components/ExplorerShell.tsx";
import { LOCALE_STORAGE_KEY } from "../features/explorer/services/localeStorage.ts";

function installDom() {
  const dom = new JSDOM("<!doctype html><html lang=\"en\"><body><div id=\"host\"></div></body></html>", {
    url: "https://example.test/",
  });
  dom.window.HTMLElement.prototype.attachEvent = () => undefined;
  dom.window.HTMLElement.prototype.detachEvent = () => undefined;
  dom.window.HTMLElement.prototype.scrollTo = () => undefined;

  const previous = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    File: dom.window.File,
    IS_REACT_ACT_ENVIRONMENT: true,
    __BUILD_VERSION__: "test-build",
  };

  for (const [name, value] of Object.entries(globals)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }

  const pendingFrames = new Map();
  let nextFrameId = 1;
  dom.window.requestAnimationFrame = (callback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    pendingFrames.set(id, callback);
    return id;
  };
  dom.window.cancelAnimationFrame = (id) => pendingFrames.delete(id);
  dom.window.matchMedia = () => ({
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return true; },
  });

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  previous.set("ResizeObserver", Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver"));
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverStub,
  });
  dom.window.ResizeObserver = ResizeObserverStub;

  return {
    dom,
    async flushFrames() {
      await act(async () => {
        const callbacks = Array.from(pendingFrames.values());
        pendingFrames.clear();
        callbacks.forEach((callback) => callback(16));
      });
    },
    restore() {
      dom.window.close();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

class WorkerStub {
  onmessage = null;
  onerror = null;
  messages = [];
  terminated = false;

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }
}

async function click(element) {
  assert.ok(element, "expected an interactive element");
  await act(async () => {
    element.click();
  });
}

test("mounted locale hydration persists switches and upload uses a native button with a hidden retryable input", async () => {
  const environment = installDom();
  const previousWorker = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    writable: true,
    value: WorkerStub,
  });
  environment.dom.window.Worker = WorkerStub;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, "el");

  const storagePrototype = Object.getPrototypeOf(window.localStorage);
  const originalSetItem = storagePrototype.setItem;
  const localeWrites = [];
  storagePrototype.setItem = function setItem(key, value) {
    if (key === LOCALE_STORAGE_KEY) localeWrites.push(value);
    return originalSetItem.call(this, key, value);
  };

  const host = document.querySelector("#host");
  const root = createRoot(host);

  try {
    await act(async () => {
      root.render(React.createElement(ExplorerShell));
    });
    await environment.flushFrames();

    assert.equal(document.documentElement.lang, "el");
    const greekButton = Array.from(document.querySelectorAll(".language-switch button"))
      .find((button) => button.textContent === "GR");
    const englishButton = Array.from(document.querySelectorAll(".language-switch button"))
      .find((button) => button.textContent === "EN");
    assert.equal(greekButton?.getAttribute("aria-pressed"), "true");

    await click(englishButton);
    assert.equal(document.documentElement.lang, "en");
    assert.equal(window.localStorage.getItem(LOCALE_STORAGE_KEY), "en");
    await click(greekButton);
    assert.equal(window.localStorage.getItem(LOCALE_STORAGE_KEY), "el");
    await click(englishButton);
    assert.deepEqual(localeWrites, ["en", "el", "en"]);

    const input = document.querySelector("#tree-file");
    const uploadButton = document.querySelector("button.upload-label");
    assert.ok(input instanceof HTMLInputElement);
    assert.equal(input.hidden, true);
    assert.equal(input.tabIndex, -1);
    assert.equal(uploadButton?.tagName, "BUTTON");
    assert.equal(uploadButton?.getAttribute("type"), "button");
    uploadButton.focus();
    assert.equal(document.activeElement, uploadButton);

    let pickerCalls = 0;
    input.click = () => {
      pickerCalls += 1;
    };
    await click(uploadButton);
    assert.equal(pickerCalls, 1);

    let inputValue = "C:\\fakepath\\study.pgn";
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["1. e4 *"], "study.pgn", { type: "application/x-chess-pgn" })],
    });
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => inputValue,
      set: (value) => { inputValue = value; },
    });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    assert.equal(inputValue, "", "the file value resets so the same file can be selected again");
    assert.equal(document.querySelector("button.upload-label"), null);
    const cancelButton = document.querySelector("button.import-cancel");
    assert.ok(cancelButton, "progress/cancel UI replaces the upload button during import");
    await click(cancelButton);
    assert.ok(document.querySelector("button.upload-label"));
  } finally {
    await act(async () => root.unmount());
    storagePrototype.setItem = originalSetItem;
    if (previousWorker) Object.defineProperty(globalThis, "Worker", previousWorker);
    else delete globalThis.Worker;
    environment.restore();
  }
});
