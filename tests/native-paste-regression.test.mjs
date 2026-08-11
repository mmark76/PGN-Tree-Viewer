import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { DEFAULT_POSITION } from "chess.js";
import { JSDOM } from "jsdom";
import { SanPastePanel } from "../features/explorer/components/SanPastePanel.tsx";
import { DEFAULT_INPUT_LIMITS } from "../features/explorer/services/inputLimits.ts";

function installDom() {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"host\"></div></body></html>",
    { url: "https://example.test/" },
  );
  dom.window.HTMLElement.prototype.attachEvent = () => undefined;
  dom.window.HTMLElement.prototype.detachEvent = () => undefined;

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

  const previous = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    Worker: WorkerStub,
    IS_REACT_ACT_ENVIRONMENT: true,
  };

  for (const [name, value] of Object.entries(globals)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  dom.window.Worker = WorkerStub;

  return {
    dom,
    restore() {
      dom.window.close();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function pasteEvent(window, text) {
  const event = new window.Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: {
      getData(format) {
        return format === "text" ? text : "";
      },
    },
  });
  return event;
}

test("mounted SAN textarea keeps valid paste native and guards limits and stale clipboard reads", async () => {
  const environment = installDom();
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.querySelector("#host"));
  const clipboardReads = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      readText() {
        const read = deferred();
        clipboardReads.push(read);
        return read.promise;
      },
    },
  });

  const renderPanel = async (building = false) => {
    await act(async () => root.render(React.createElement(SanPastePanel, {
      locale: "en",
      selectedFen: DEFAULT_POSITION,
      selectedLabel: "Start",
      selectedIsStandardRoot: true,
      building,
      buildProgress: { stage: "building", percent: 40 },
      buildError: "",
      onAdd() {},
      onReplace() {},
      onCancelBuild() {},
      onClose() {},
    })));
  };

  try {
    await renderPanel();
    const textarea = document.querySelector("#san-input");
    assert.ok(textarea instanceof HTMLTextAreaElement);
    assert.equal(textarea.maxLength, DEFAULT_INPUT_LIMITS.maxSanCharacters);
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    assert.ok(valueSetter);

    const commitNativeInput = async (value, caret = value.length) => {
      await act(async () => {
        valueSetter.call(textarea, value);
        textarea.setSelectionRange(caret, caret);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
      assert.equal(textarea.value, value);
      assert.equal(textarea.selectionStart, caret);
      assert.equal(textarea.selectionEnd, caret);
    };
    const clipboardButton = () => Array.from(document.querySelectorAll("button"))
      .find((button) => /Paste from clipboard/.test(button.textContent ?? ""));
    const startClipboardRead = async () => {
      const before = clipboardReads.length;
      await act(async () => clipboardButton()?.click());
      assert.equal(clipboardReads.length, before + 1);
      return clipboardReads.at(-1);
    };
    const settleClipboardRead = async (read, value) => {
      await act(async () => {
        read.resolve(value);
        await Promise.resolve();
        await Promise.resolve();
      });
    };

    const initialPaste = pasteEvent(window, "1. e4 e5");
    assert.equal(textarea.dispatchEvent(initialPaste), true);
    assert.equal(initialPaste.defaultPrevented, false);
    await commitNativeInput("1. e4 e5");

    textarea.setSelectionRange(6, 8);
    const selectedMultilinePaste = pasteEvent(window, "c5\n2. Nf3");
    assert.equal(textarea.dispatchEvent(selectedMultilinePaste), true);
    assert.equal(selectedMultilinePaste.defaultPrevented, false);
    await commitNativeInput("1. e4 c5\n2. Nf3");

    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    const caretPaste = pasteEvent(window, " Nc6");
    assert.equal(textarea.dispatchEvent(caretPaste), true);
    assert.equal(caretPaste.defaultPrevented, false);
    await commitNativeInput("1. e4 c5\n2. Nf3 Nc6");

    for (const init of [
      { key: "v", ctrlKey: true },
      { key: "v", metaKey: true },
      { key: "Insert", shiftKey: true },
    ]) {
      const event = new KeyboardEvent("keydown", {
        ...init,
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
    const contextMenu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    textarea.dispatchEvent(contextMenu);
    assert.equal(contextMenu.defaultPrevented, false);

    const remainingCapacity = DEFAULT_INPUT_LIMITS.maxSanCharacters - textarea.value.length;
    const windowsMultilineAtLimit = pasteEvent(
      window,
      `${"x".repeat(remainingCapacity - 1)}\r\n`,
    );
    assert.equal(textarea.dispatchEvent(windowsMultilineAtLimit), true);
    assert.equal(windowsMultilineAtLimit.defaultPrevented, false);

    const exactLimitPaste = pasteEvent(window, "x".repeat(remainingCapacity));
    assert.equal(textarea.dispatchEvent(exactLimitPaste), true);
    assert.equal(exactLimitPaste.defaultPrevented, false);

    const overflowPaste = pasteEvent(window, "x".repeat(remainingCapacity + 1));
    await act(async () => textarea.dispatchEvent(overflowPaste));
    assert.equal(overflowPaste.defaultPrevented, true);
    assert.equal(textarea.value, "1. e4 c5\n2. Nf3 Nc6");
    assert.match(document.querySelector(".san-message.error")?.textContent ?? "", /262,144/);

    const oversizedProgrammaticValue = "x".repeat(DEFAULT_INPUT_LIMITS.maxSanCharacters + 1);
    await act(async () => {
      valueSetter.call(textarea, oversizedProgrammaticValue);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert.equal(textarea.value, "1. e4 c5\n2. Nf3 Nc6");
    assert.match(document.querySelector(".san-message.error")?.textContent ?? "", /262,144/);

    const staleRead = await startClipboardRead();
    await commitNativeInput("newer typed input");
    await settleClipboardRead(staleRead, "older clipboard snapshot");
    assert.equal(textarea.value, "newer typed input");

    const olderRead = await startClipboardRead();
    const newerRead = await startClipboardRead();
    await settleClipboardRead(newerRead, "newest clipboard result");
    assert.equal(textarea.value, "newest clipboard result");
    await settleClipboardRead(olderRead, "out-of-order old result");
    assert.equal(textarea.value, "newest clipboard result");

    const windowsClipboardRead = await startClipboardRead();
    await settleClipboardRead(windowsClipboardRead, "1. e4\r\n1... c5");
    assert.equal(textarea.value, "1. e4\n1... c5");

    const buildStaleRead = await startClipboardRead();
    await renderPanel(true);
    assert.equal(textarea.disabled, true);
    await settleClipboardRead(buildStaleRead, "must not land while building");
    assert.equal(textarea.value, "1. e4\n1... c5");

    await renderPanel(false);
    const unmountStaleRead = await startClipboardRead();
    await act(async () => root.unmount());
    await settleClipboardRead(unmountStaleRead, "must not update after unmount");
  } finally {
    if (document.querySelector("#san-input")) await act(async () => root.unmount());
    environment.restore();
  }
});
