import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { DEFAULT_POSITION } from "chess.js";
import { ExplorerShell } from "../features/explorer/components/ExplorerShell.tsx";
import {
  playBoardMove,
  promotionChoicesForMove,
} from "../features/explorer/services/boardMove.ts";
import { createManualLine } from "../features/explorer/services/manualLines.ts";
import { validateSanContexts } from "../features/explorer/services/sanParser.ts";
import { buildTree, gameCount } from "../features/explorer/services/treeBuilder.ts";

const CUSTOM_PROMOTION_FEN = "7k/4P3/8/8/8/8/8/K7 w - - 0 1";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"host\"></div></body></html>", {
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
        for (let pass = 0; pass < 10 && pendingFrames.size; pass += 1) {
          const callbacks = Array.from(pendingFrames.values());
          pendingFrames.clear();
          callbacks.forEach((callback) => callback(16 + pass));
        }
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
  static instances = [];

  onmessage = null;
  onerror = null;
  messages = [];
  terminated = false;

  constructor() {
    WorkerStub.instances.push(this);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  async respond(response) {
    await act(async () => {
      this.onmessage?.({ data: response });
    });
  }
}

function buttonNamed(name) {
  return Array.from(document.querySelectorAll("button"))
    .find((button) => button.textContent?.trim().includes(name)
      || button.getAttribute("aria-label") === name);
}

async function click(element) {
  assert.ok(element, "expected an interactive element");
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

async function selectFile(name) {
  const input = document.querySelector("#tree-file");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["pgn"], name, { type: "application/x-chess-pgn" })],
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function workerRequest(worker) {
  const request = worker.messages.at(-1);
  assert.ok(request, "worker should have received a request");
  return request;
}

async function completeImport(worker, lines, fileKind = "pgn") {
  const request = workerRequest(worker);
  const tree = buildTree(lines);
  await worker.respond({
    type: "success",
    requestId: request.requestId,
    payload: {
      kind: fileKind,
      lines,
      tree,
      settings: null,
      gameCount: gameCount(tree.results),
      skippedCount: 0,
    },
  });
}

test("promotion move validation covers exact capture SAN for both colors", () => {
  const positions = [
    {
      fen: "k6r/6P1/8/8/8/8/8/K7 w - - 0 1",
      from: "g7",
      to: "h8",
      prefix: "gxh8=",
    },
    {
      fen: "7k/8/8/8/8/8/1p6/R6K b - - 0 1",
      from: "b2",
      to: "a1",
      prefix: "bxa1=",
    },
  ];

  for (const { fen, from, to, prefix } of positions) {
    assert.deepEqual(promotionChoicesForMove(fen, from, to), ["q", "r", "b", "n"]);
    for (const [piece, sanPiece] of [["q", "Q+"], ["r", "R+"], ["b", "B"], ["n", "N"]]) {
      const played = playBoardMove(fen, from, to, piece);
      assert.equal(played?.promotion, piece);
      assert.equal(played?.san, `${prefix}${sanPiece}`);
    }
  }
});

test("mounted editing flow promotes exactly once, confirms replacement, preserves failures, and restores one snapshot", async () => {
  const environment = installDom();
  const previousWorker = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  const previousCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const previousRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const previousAnchorClick = environment.dom.window.HTMLAnchorElement.prototype.click;
  const downloads = [];
  let failNextDownload = false;
  let clipboardValue = "";
  const confirmMessages = [];
  const confirmAnswers = [];

  WorkerStub.instances = [];
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    writable: true,
    value: WorkerStub,
  });
  environment.dom.window.Worker = WorkerStub;
  environment.dom.window.confirm = (message) => {
    confirmMessages.push(message);
    return confirmAnswers.shift() ?? false;
  };
  Object.defineProperty(environment.dom.window.navigator, "clipboard", {
    configurable: true,
    value: { readText: async () => clipboardValue },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value(blob) {
      if (failNextDownload) {
        failNextDownload = false;
        throw new Error("simulated download failure");
      }
      downloads.push(blob);
      return `blob:test-${downloads.length}`;
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value() {},
  });
  environment.dom.window.HTMLAnchorElement.prototype.click = () => undefined;

  const oldLines = [createManualLine(["Kb2"], CUSTOM_PROMOTION_FEN)];
  const replacementLines = [createManualLine(["e4"], DEFAULT_POSITION)];
  const host = document.querySelector("#host");
  const root = createRoot(host);

  const rootTreeItem = () => document.querySelector('[role="treeitem"][aria-level="1"]');
  const square = (name) => document.querySelector(`[data-square="${name}"]`);
  const nodeSans = () => Array.from(document.querySelectorAll(".node-san"))
    .map((element) => element.textContent?.trim());
  const openPromotion = async () => {
    await click(square("e7"));
    await click(square("e8"));
    return document.querySelector('[role="dialog"][aria-labelledby="promotion-title"]');
  };

  try {
    await act(async () => root.render(React.createElement(ExplorerShell)));
    await environment.flushFrames();

    await selectFile("custom-start.pgn");
    assert.equal(WorkerStub.instances.length, 1);
    await completeImport(WorkerStub.instances[0], oldLines);
    await environment.flushFrames();
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "false");
    assert.equal(document.querySelector('[data-square="e7"] [data-piece="wP"]') !== null, true);

    clipboardValue = "Kb2";
    await click(buttonNamed("Paste SAN / PGN"));
    await click(buttonNamed("Paste from clipboard"));
    await click(buttonNamed("Validate"));
    const duplicateValidationWorker = WorkerStub.instances.at(-1);
    const duplicateValidationRequest = workerRequest(duplicateValidationWorker);
    await duplicateValidationWorker.respond({
      type: "san-success",
      requestId: duplicateValidationRequest.requestId,
      payload: validateSanContexts("Kb2", CUSTOM_PROMOTION_FEN),
    });
    const workerCountBeforeDuplicate = WorkerStub.instances.length;
    await click(buttonNamed("Add from here"));
    assert.equal(WorkerStub.instances.length, workerCountBeforeDuplicate);
    assert.equal(document.querySelector("#san-title"), null);
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "false");
    assert.match(document.querySelector(".notice")?.textContent ?? "", /already in the tree/i);

    // Escape before the board's scheduled selection reset is deliberately
    // adversarial: the stale source square must not reappear after the dialog closes.
    const cancelledDialog = await openPromotion();
    assert.ok(cancelledDialog);
    assert.equal(document.activeElement?.getAttribute("aria-label"), "Promote to queen");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }));
    });
    assert.equal(document.querySelector("#promotion-title"), null);
    await click(square("e8"));
    assert.equal(document.querySelector("#promotion-title"), null);
    await environment.flushFrames();
    assert.equal(nodeSans().some((san) => san?.startsWith("e8=")), false);

    const promotionCases = [
      ["Promote to queen", "e8=Q+"],
      ["Promote to rook", "e8=R+"],
      ["Promote to bishop", "e8=B"],
      ["Promote to knight", "e8=N"],
    ];
    for (const [label, san] of promotionCases) {
      await click(rootTreeItem());
      const dialog = await openPromotion();
      assert.ok(dialog);
      assert.equal(dialog.querySelectorAll(".promotion-choice").length, 4);
      await click(dialog.querySelector(`[aria-label="${label}"]`));
      assert.equal(document.querySelector("#promotion-title"), null);
      assert.equal(nodeSans().filter((value) => value === san).length, 1);
    }
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");

    // Collapsing the selected descendant's ancestor must first move selection
    // to that visible ancestor; the state is then part of the undo snapshot.
    await click(document.querySelector(".collapse-control"));
    assert.equal(document.querySelectorAll('[role="treeitem"]').length, 1);
    assert.equal(rootTreeItem()?.getAttribute("aria-selected"), "true");

    await click(buttonNamed("Next main-line move"));
    const revealedSelection = document.querySelector('[role="treeitem"][aria-selected="true"]');
    assert.equal(rootTreeItem()?.getAttribute("aria-expanded"), "true");
    assert.equal(document.querySelectorAll('[role="treeitem"]').length > 1, true);
    assert.equal(revealedSelection?.getAttribute("aria-level"), "2");

    // Restore the collapsed-parent state expected by the replacement checks below.
    await click(document.querySelector(".collapse-control"));
    assert.equal(document.querySelectorAll('[role="treeitem"]').length, 1);
    assert.equal(rootTreeItem()?.getAttribute("aria-selected"), "true");

    const workerCountBeforeCancel = WorkerStub.instances.length;
    confirmAnswers.push(false);
    await selectFile("replacement.pgn");
    assert.equal(WorkerStub.instances.length, workerCountBeforeCancel);
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");
    assert.match(confirmMessages.at(-1), /unsaved changes/i);

    confirmAnswers.push(true);
    await selectFile("replacement.pgn");
    const failedWorker = WorkerStub.instances.at(-1);
    const failedRequest = workerRequest(failedWorker);
    const downloadDuringImport = buttonNamed("Download tree");
    assert.equal(downloadDuringImport.disabled, true);
    await click(downloadDuringImport);
    assert.equal(downloads.length, 0);
    await failedWorker.respond({
      type: "error",
      requestId: failedRequest.requestId,
      error: { code: "read-failed" },
    });
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");
    assert.equal(document.querySelectorAll('[role="treeitem"]').length, 1);
    assert.equal(buttonNamed("Undo replacement"), undefined);

    confirmAnswers.push(true);
    await selectFile("replacement.pgn");
    const successfulWorker = WorkerStub.instances.at(-1);
    await completeImport(successfulWorker, replacementLines);
    await environment.flushFrames();
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "false");
    assert.equal(nodeSans().includes("e4"), true);
    assert.equal(document.querySelector('[data-square="e2"] [data-piece="wP"]') !== null, true);

    const undo = buttonNamed("Undo replacement");
    assert.ok(undo);
    await click(undo);
    await environment.flushFrames();
    assert.equal(buttonNamed("Undo replacement"), undefined);
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");
    assert.match(document.querySelector(".header-source")?.textContent ?? "", /custom-start\.pgn/);
    assert.equal(document.querySelector('[data-square="e7"] [data-piece="wP"]') !== null, true);
    assert.equal(document.querySelectorAll('[role="treeitem"]').length, 1);
    assert.equal(rootTreeItem()?.getAttribute("aria-selected"), "true");
    assert.equal(document.activeElement, rootTreeItem());

    await click(document.querySelector(".collapse-control"));
    for (const expected of ["Kb2", "e8=Q+", "e8=R+", "e8=B", "e8=N"]) {
      assert.equal(nodeSans().filter((san) => san === expected).length, 1);
    }

    // SAN replacement uses the same transaction boundary. Build one more
    // manual branch so cancel/accept can be distinguished from the imported tree.
    await click(square("a1"));
    await click(square("b1"));
    assert.equal(nodeSans().filter((san) => san === "Kb1").length, 1);
    await click(rootTreeItem());
    clipboardValue = "e4";
    await click(buttonNamed("Paste SAN / PGN"));
    const sanInput = document.querySelector("#san-input");
    await click(buttonNamed("Paste from clipboard"));
    const validateButton = buttonNamed("Validate");
    assert.equal(sanInput.value, "e4");
    assert.equal(validateButton.disabled, false);
    await click(validateButton);
    const validationWorker = WorkerStub.instances.at(-1);
    const validationRequest = workerRequest(validationWorker);
    assert.equal(validationRequest.type, "validate-san");
    await validationWorker.respond({
      type: "san-success",
      requestId: validationRequest.requestId,
      payload: validateSanContexts("e4", CUSTOM_PROMOTION_FEN),
    });

    const workerCountBeforeSanCancel = WorkerStub.instances.length;
    confirmAnswers.push(false);
    await click(buttonNamed("New tree"));
    assert.equal(WorkerStub.instances.length, workerCountBeforeSanCancel);
    assert.ok(document.querySelector("#san-title"));
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");

    confirmAnswers.push(true);
    await click(buttonNamed("New tree"));
    const sanBuildWorker = WorkerStub.instances.at(-1);
    const sanBuildRequest = workerRequest(sanBuildWorker);
    assert.equal(sanBuildRequest.type, "build-tree");
    await sanBuildWorker.respond({
      type: "build-success",
      requestId: sanBuildRequest.requestId,
      payload: { lines: replacementLines, tree: buildTree(replacementLines) },
    });
    await environment.flushFrames();
    assert.equal(document.querySelector("#san-title"), null);
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");
    assert.equal(nodeSans().includes("e4"), true);
    await click(buttonNamed("Undo replacement"));
    await environment.flushFrames();
    assert.equal(buttonNamed("Undo replacement"), undefined);
    assert.equal(document.activeElement, rootTreeItem());
    assert.equal(document.querySelector('[data-square="e7"] [data-piece="wP"]') !== null, true);
    for (const expected of ["Kb2", "Kb1", "e8=Q+", "e8=R+", "e8=B", "e8=N"]) {
      assert.equal(nodeSans().filter((san) => san === expected).length, 1);
    }

    await click(buttonNamed("Download tree"));
    failNextDownload = true;
    const suppressExpectedDownloadError = (event) => event.preventDefault();
    environment.dom.window.addEventListener("error", suppressExpectedDownloadError);
    await click(buttonNamed("Chess Tree Builder JSON file"));
    environment.dom.window.removeEventListener("error", suppressExpectedDownloadError);
    assert.equal(downloads.length, 0);
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "true");

    await click(buttonNamed("Chess Tree Builder JSON file"));
    assert.equal(downloads.length, 1);
    const saved = JSON.parse(await downloads[0].text());
    assert.equal(saved.lines.every((line) => line.startFen === CUSTOM_PROMOTION_FEN), true);
    assert.equal(saved.lines.length, 6);
    assert.equal(document.querySelector(".app-shell").dataset.contentDirty, "false");

    const confirmationsBeforeCleanReplace = confirmMessages.length;
    await selectFile("clean-replacement.pgn");
    assert.equal(confirmMessages.length, confirmationsBeforeCleanReplace);
    assert.equal(WorkerStub.instances.at(-1).messages.at(-1).type, "import");
    await click(buttonNamed("Cancel import"));
  } finally {
    await act(async () => root.unmount());
    if (previousWorker) Object.defineProperty(globalThis, "Worker", previousWorker);
    else delete globalThis.Worker;
    if (previousCreateObjectUrl) Object.defineProperty(URL, "createObjectURL", previousCreateObjectUrl);
    else delete URL.createObjectURL;
    if (previousRevokeObjectUrl) Object.defineProperty(URL, "revokeObjectURL", previousRevokeObjectUrl);
    else delete URL.revokeObjectURL;
    environment.dom.window.HTMLAnchorElement.prototype.click = previousAnchorClick;
    environment.restore();
  }
});
