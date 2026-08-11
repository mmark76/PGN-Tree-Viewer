import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { DownloadPanel } from "../features/explorer/components/DownloadPanel.tsx";
import { MoveTree } from "../features/explorer/components/MoveTree.tsx";
import { SanPastePanel } from "../features/explorer/components/SanPastePanel.tsx";
import {
  applyModalEnvironment,
  getDialogFocusableElements,
  getModalBackgroundElements,
  trapDialogTabKey,
  useModalFocus,
} from "../features/explorer/services/modalFocus.ts";
import {
  REDUCED_MOTION_MEDIA_QUERY,
  prefersReducedMotion,
} from "../features/explorer/services/reducedMotion.ts";

const workspaceUrl = new URL("../", import.meta.url);

function installDom(markup = "<!doctype html><html><body></body></html>") {
  const dom = new JSDOM(markup, { url: "https://example.test/" });
  // React's legacy input-event fallback probes these IE methods when the DOM
  // is installed after react-dom is imported. jsdom intentionally omits them.
  dom.window.HTMLElement.prototype.attachEvent = () => undefined;
  dom.window.HTMLElement.prototype.detachEvent = () => undefined;
  const previous = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
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

test("dialog focus helpers expose only available controls and wrap Tab navigation", () => {
  const environment = installDom(`
    <!doctype html><html><body>
      <section id="dialog" tabindex="-1">
        <button id="first">First</button>
        <button id="disabled" disabled>Disabled</button>
        <div hidden><button id="hidden-child">Hidden child</button></div>
        <div aria-hidden="true"><a id="hidden-link" href="#">Hidden link</a></div>
        <button id="last">Last</button>
      </section>
    </body></html>
  `);

  try {
    const dialog = document.querySelector("#dialog");
    const first = document.querySelector("#first");
    const last = document.querySelector("#last");

    assert.deepEqual(
      getDialogFocusableElements(dialog).map((element) => element.id),
      ["first", "last"],
    );

    last.focus();
    const forward = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    assert.equal(trapDialogTabKey(forward, dialog), true);
    assert.equal(forward.defaultPrevented, true);
    assert.equal(document.activeElement, first);

    first.focus();
    const backward = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    assert.equal(trapDialogTabKey(backward, dialog), true);
    assert.equal(document.activeElement, last);

    const unrelated = new KeyboardEvent("keydown", { key: "ArrowDown" });
    assert.equal(trapDialogTabKey(unrelated, dialog), false);
  } finally {
    environment.restore();
  }
});

test("modal environment makes app siblings inert and restores their exact state", () => {
  const environment = installDom(`
    <!doctype html><html><body style="overflow: auto">
      <div class="app-shell">
        <header id="header"></header>
        <main id="content" aria-hidden="false" inert></main>
        <div data-modal-root><section id="dialog"></section></div>
      </div>
    </body></html>
  `);

  try {
    const dialog = document.querySelector("#dialog");
    const header = document.querySelector("#header");
    const content = document.querySelector("#content");

    assert.deepEqual(
      getModalBackgroundElements(dialog).map((element) => element.id),
      ["header", "content"],
    );

    const restore = applyModalEnvironment(dialog);
    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(header.getAttribute("aria-hidden"), "true");
    assert.equal(header.hasAttribute("inert"), true);
    assert.equal(content.getAttribute("aria-hidden"), "true");

    restore();
    assert.equal(document.body.style.overflow, "auto");
    assert.equal(header.hasAttribute("aria-hidden"), false);
    assert.equal(header.hasAttribute("inert"), false);
    assert.equal(content.getAttribute("aria-hidden"), "false");
    assert.equal(content.hasAttribute("inert"), true);
  } finally {
    environment.restore();
  }
});

test("modal hook sets initial focus, traps focus, closes on Escape, and restores the opener", async () => {
  const environment = installDom();
  let closeCount = 0;

  function TestModal({ onClose }) {
    const dialogRef = React.useRef(null);
    const initialFocusRef = React.useRef(null);
    useModalFocus({ dialogRef, initialFocusRef, onClose });

    return React.createElement(
      "div",
      { "data-modal-root": "" },
      React.createElement(
        "section",
        { id: "test-dialog", ref: dialogRef, tabIndex: -1 },
        React.createElement("button", { id: "initial", ref: initialFocusRef }, "Initial"),
        React.createElement("button", { id: "last" }, "Last"),
      ),
    );
  }

  function Harness() {
    const [open, setOpen] = React.useState(false);
    const close = () => {
      closeCount += 1;
      setOpen(false);
    };

    return React.createElement(
      "div",
      { className: "app-shell" },
      React.createElement(
        "main",
        { id: "background", "data-modal-app-content": "" },
        React.createElement(
          "button",
          { id: "opener", type: "button", onClick: () => setOpen(true) },
          "Open",
        ),
      ),
      open ? React.createElement(TestModal, { onClose: close }) : null,
    );
  }

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  try {
    await act(async () => root.render(React.createElement(Harness)));
    const opener = document.querySelector("#opener");
    opener.focus();

    await act(async () => {
      opener.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    assert.equal(document.activeElement?.id, "initial");
    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(document.querySelector("#background").hasAttribute("inert"), true);

    document.querySelector("#last").focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }));
    });
    assert.equal(document.activeElement?.id, "initial");

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }));
    });

    assert.equal(closeCount, 1);
    assert.equal(document.querySelector("#test-dialog"), null);
    assert.equal(document.activeElement, opener);
    assert.equal(document.body.style.overflow, "");
    assert.equal(document.querySelector("#background").hasAttribute("inert"), false);
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});

test("SAN build transitions move focus to Cancel and recover it inside the dialog", async () => {
  const environment = installDom();
  const escapeTarget = document.createElement("button");
  escapeTarget.textContent = "Outside test target";
  document.body.append(escapeTarget);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const baseProps = {
    locale: "en",
    selectedFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    selectedLabel: "Start",
    selectedIsStandardRoot: true,
    buildProgress: { stage: "building", percent: 40 },
    onAdd() {},
    onReplace() {},
    onCancelBuild() {},
    onClose() {},
  };
  const renderPanel = async (building, buildError = "") => {
    await act(async () => root.render(React.createElement(
      "div",
      { className: "app-shell" },
      React.createElement("main", { "data-modal-app-content": "" }, "Application"),
      React.createElement(SanPastePanel, { ...baseProps, building, buildError }),
    )));
  };

  try {
    await renderPanel(false);
    assert.equal(document.activeElement, document.querySelector("#san-input"));

    const footerAction = document.querySelector(".san-footer button");
    footerAction.disabled = false;
    footerAction.focus();
    assert.equal(document.activeElement, footerAction);

    await renderPanel(true);
    const cancel = document.querySelector(".san-footer button");
    assert.match(cancel.textContent, /Cancel/i);
    assert.equal(document.activeElement, cancel);

    escapeTarget.focus();
    assert.equal(document.activeElement, escapeTarget);
    await renderPanel(false, "Build failed");
    assert.equal(document.activeElement, document.querySelector("#san-input"));
    assert.match(document.querySelector(".san-message.error").textContent, /Build failed/);
    assert.ok(document.querySelector(".san-dialog").contains(document.activeElement));
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});

test("download dialog has a labelled, described, keyboard-focusable scroll structure", () => {
  const markup = renderToStaticMarkup(React.createElement(DownloadPanel, {
    locale: "en",
    onDownload() {},
    onClose() {},
  }));
  const dom = new JSDOM(markup);
  const dialog = dom.window.document.querySelector(".settings-dialog.download-dialog");

  assert.ok(dialog);
  assert.equal(dialog.getAttribute("role"), "dialog");
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  assert.equal(dialog.getAttribute("aria-labelledby"), "download-title");
  assert.equal(dialog.getAttribute("aria-describedby"), "download-description");
  assert.equal(dialog.getAttribute("tabindex"), "-1");
  assert.ok(dialog.querySelector(".download-options"));
  assert.equal(dialog.querySelectorAll(".download-option").length, 3);

  dom.window.close();
});

test("rendered move tree exposes ARIA metadata, unscaled touch targets, and a keyboard navigator", async () => {
  const results = { white: 0, draw: 0, black: 0, unknown: 0 };
  const e5 = {
    id: "e5",
    san: "e5",
    ply: 2,
    fen: "e5-fen",
    parentId: "e4",
    move: null,
    results,
    openingTotals: {},
    children: [],
  };
  const e4 = {
    id: "e4",
    san: "e4",
    ply: 1,
    fen: "e4-fen",
    parentId: "start",
    move: null,
    results,
    openingTotals: {},
    children: [e5],
  };
  const d4 = {
    id: "d4",
    san: "d4",
    ply: 1,
    fen: "d4-fen",
    parentId: "start",
    move: null,
    results,
    openingTotals: {},
    children: [],
  };
  const rootNode = {
    id: "start",
    san: "",
    ply: 0,
    fen: "start-fen",
    parentId: null,
    move: null,
    results,
    openingTotals: {},
    children: [e4, d4],
  };
  const zoom = 0.67;
  const markup = renderToStaticMarkup(React.createElement(MoveTree, {
    root: rootNode,
    selectedId: "d4",
    collapsedIds: new Set(["e4"]),
    zoom,
    viewMode: "manual",
    fitRequest: 0,
    locale: "en",
    direction: "right",
    onZoomChange() {},
    onSelect() {},
    onToggle() {},
  }));
  const dom = new JSDOM(markup);
  const document = dom.window.document;
  const tree = document.querySelector('[role="tree"]');
  const items = Array.from(document.querySelectorAll('[role="treeitem"]'));

  assert.ok(tree);
  assert.ok(tree.getAttribute("aria-label"));
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((item) => item.getAttribute("aria-level")), ["1", "2", "2"]);
  assert.deepEqual(items.map((item) => item.getAttribute("aria-posinset")), ["1", "1", "2"]);
  assert.deepEqual(items.map((item) => item.getAttribute("aria-setsize")), ["1", "2", "2"]);
  assert.deepEqual(items.map((item) => item.getAttribute("aria-expanded")), ["true", "false", null]);
  assert.deepEqual(items.map((item) => item.getAttribute("aria-selected")), ["false", "false", "true"]);
  assert.deepEqual(items.map((item) => item.getAttribute("tabindex")), ["-1", "-1", "0"]);
  assert.equal(document.body.textContent.includes("e5"), false);

  const collapseControls = document.querySelectorAll(".collapse-control");
  assert.equal(collapseControls.length, 2);
  assert.ok(Array.from(collapseControls).every((control) => (
    control.tagName === "SPAN" && control.getAttribute("aria-hidden") === "true"
  )));
  const canvas = document.querySelector(".tree-canvas");
  const collapseOverlay = document.querySelector(".tree-collapse-overlay");
  assert.equal(collapseOverlay?.parentElement, canvas);
  assert.equal(canvas?.firstElementChild?.contains(collapseOverlay), false);

  const css = await readFile(new URL("app/globals.css", workspaceUrl), "utf8");
  const collapseRule = css.match(/\.collapse-control\s*\{([^}]*)\}/)?.[1] ?? "";
  const declaredWidth = Number(collapseRule.match(/\bwidth:\s*([\d.]+)px/)?.[1]);
  const declaredHeight = Number(collapseRule.match(/\bheight:\s*([\d.]+)px/)?.[1]);
  let ancestorScale = 1;
  for (let ancestor = collapseControls[0]?.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const scale = ancestor.style.transform.match(/scale\(([\d.]+)\)/)?.[1];
    if (scale) ancestorScale *= Number(scale);
  }
  assert.equal(ancestorScale, 1, `collapse overlay must remain outside the ${zoom} scaled subtree`);
  assert.ok(declaredWidth * ancestorScale >= 44);
  assert.ok(declaredHeight * ancestorScale >= 44);

  const navigator = document.querySelector("button.tree-navigator-map");
  assert.ok(navigator);
  assert.ok(navigator.getAttribute("aria-label"));
  assert.ok(document.getElementById(navigator.getAttribute("aria-controls")));
  assert.equal(navigator.querySelector("svg")?.getAttribute("aria-hidden"), "true");
  assert.equal(navigator.querySelector("svg")?.getAttribute("focusable"), "false");

  dom.window.close();
});

test("tree layering preserves node hit priority at zoom 0.67 and 0.5", async () => {
  const css = await readFile(new URL("app/globals.css", workspaceUrl), "utf8");
  const ruleBody = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const body = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1];
    assert.ok(body, `missing CSS rule for ${selector}`);
    return body;
  };
  assert.match(ruleBody(".tree-lines-layer"), /z-index:\s*1;[\s\S]*pointer-events:\s*none/);
  assert.match(ruleBody(".tree-collapse-overlay"), /z-index:\s*3;[\s\S]*pointer-events:\s*none/);
  assert.match(ruleBody(".tree-items"), /z-index:\s*4;[\s\S]*pointer-events:\s*none/);
  assert.match(ruleBody(".move-node"), /pointer-events:\s*auto/);
  assert.match(ruleBody(".collapse-control"), /pointer-events:\s*auto/);

  const results = { white: 0, draw: 0, black: 0, unknown: 0 };
  const child = {
    id: "e4",
    san: "e4",
    ply: 1,
    fen: "e4-fen",
    parentId: "start",
    move: null,
    results,
    openingTotals: {},
    children: [],
  };
  const rootNode = {
    id: "start",
    san: "",
    ply: 0,
    fen: "start-fen",
    parentId: null,
    move: null,
    results,
    openingTotals: {},
    children: [child],
  };

  for (const zoom of [0.67, 0.5]) {
    const markup = renderToStaticMarkup(React.createElement(MoveTree, {
      root: rootNode,
      selectedId: "start",
      collapsedIds: new Set(),
      zoom,
      viewMode: "manual",
      fitRequest: 0,
      locale: "en",
      direction: "right",
      onZoomChange() {},
      onSelect() {},
      onToggle() {},
    }));
    const dom = new JSDOM(markup);
    const document = dom.window.document;
    const canvas = document.querySelector(".tree-canvas");
    const linesLayer = document.querySelector(".tree-lines-layer");
    const itemsLayer = document.querySelector(".tree-items");
    const overlay = document.querySelector(".tree-collapse-overlay");
    const control = document.querySelector(".collapse-control");
    const rootWrap = document.querySelector(".tree-node-wrap");

    assert.equal(linesLayer.parentElement, canvas);
    assert.equal(itemsLayer.parentElement, canvas);
    assert.equal(overlay.parentElement, canvas);
    assert.equal(linesLayer.style.transform, `scale(${zoom})`);
    assert.equal(itemsLayer.style.transform, `scale(${zoom})`);
    assert.equal(control.closest(".tree-collapse-overlay"), overlay);

    const scaledNodeCenterX = Number.parseFloat(rootWrap.style.left) * zoom;
    const controlCenterX = Number.parseFloat(control.style.left);
    const centerDistance = Math.abs(controlCenterX - scaledNodeCenterX);
    const scaledNodeRadius = 29 * zoom;
    assert.ok(Math.abs(centerDistance - 30 * zoom) < 0.0001);
    assert.ok(centerDistance > scaledNodeRadius, `collapse center must clear the node at zoom ${zoom}`);
    assert.ok(
      centerDistance < scaledNodeRadius + 22,
      `overlapping hitboxes at zoom ${zoom} require the asserted node-above-control layering`,
    );
    dom.window.close();
  }
});

test("mounted move tree wires roving focus, selection, collapse, and navigator scrolling", async () => {
  const environment = installDom();
  const previousResizeObserver = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
  const pendingFrames = new Map();
  let nextFrameId = 1;
  const mediaListeners = new Set();
  const reducedMotionQuery = {
    matches: true,
    media: REDUCED_MOTION_MEDIA_QUERY,
    onchange: null,
    addEventListener(type, listener) {
      if (type === "change") mediaListeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") mediaListeners.delete(listener);
    },
    addListener(listener) {
      mediaListeners.add(listener);
    },
    removeListener(listener) {
      mediaListeners.delete(listener);
    },
    dispatchEvent() {
      return true;
    },
  };

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverStub,
  });
  environment.dom.window.matchMedia = () => reducedMotionQuery;
  environment.dom.window.requestAnimationFrame = (callback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    pendingFrames.set(id, callback);
    return id;
  };
  environment.dom.window.cancelAnimationFrame = (id) => {
    pendingFrames.delete(id);
  };

  const results = { white: 0, draw: 0, black: 0, unknown: 0 };
  const makeNode = (id, parentId, ply, children = []) => ({
    id,
    san: id === "start" ? "" : id,
    ply,
    fen: `${id}-fen`,
    parentId,
    move: null,
    results,
    openingTotals: {},
    children,
  });
  const e5 = makeNode("e5", "e4", 2);
  const e4 = makeNode("e4", "start", 1, [e5]);
  const d4 = makeNode("d4", "start", 1);
  const rootNode = makeNode("start", null, 0, [e4, d4]);
  const selections = [];
  const toggles = [];

  function Harness() {
    const [selectedId, setSelectedId] = React.useState("start");
    const [collapsedIds, setCollapsedIds] = React.useState(() => new Set());

    return React.createElement(MoveTree, {
      root: rootNode,
      selectedId,
      collapsedIds,
      zoom: 0.67,
      viewMode: "manual",
      fitRequest: 0,
      locale: "en",
      direction: "right",
      onZoomChange() {},
      onSelect(id) {
        selections.push(id);
        setSelectedId(id);
      },
      onToggle(id) {
        toggles.push(id);
        setCollapsedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
    });
  }

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const treeItem = (san) => Array.from(document.querySelectorAll('[role="treeitem"]'))
    .find((item) => item.querySelector(".node-san")?.textContent === san);
  const press = async (element, key) => {
    await act(async () => {
      element.dispatchEvent(new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      }));
    });
  };

  try {
    await act(async () => root.render(React.createElement(Harness)));
    const viewport = document.querySelector("#move-tree-viewport");
    const navigator = document.querySelector("button.tree-navigator-map");
    const scrollCalls = [];
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 120 },
      clientHeight: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 1200 },
      scrollHeight: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, writable: true, value: 100 },
      scrollTop: { configurable: true, writable: true, value: 80 },
      scrollTo: {
        configurable: true,
        value(options) {
          scrollCalls.push(options);
        },
      },
    });
    assert.ok(pendingFrames.size > 0);
    await act(async () => {
      const callbacks = Array.from(pendingFrames.values());
      pendingFrames.clear();
      callbacks.forEach((callback) => callback(16));
    });
    assert.equal(navigator.closest(".tree-navigator").hidden, false);

    const start = document.querySelector('[role="treeitem"]');
    await act(async () => start.focus());

    await press(start, "ArrowDown");
    assert.equal(document.activeElement, treeItem("e4"));
    await press(document.activeElement, "ArrowDown");
    assert.equal(document.activeElement, treeItem("e5"));
    await press(document.activeElement, "ArrowUp");
    assert.equal(document.activeElement, treeItem("e4"));
    await press(document.activeElement, "Home");
    assert.equal(document.activeElement, start);
    await press(document.activeElement, "ArrowUp");
    assert.equal(document.activeElement, start);
    await press(document.activeElement, "End");
    assert.equal(document.activeElement, treeItem("d4"));

    await press(document.activeElement, "Home");
    await press(document.activeElement, "ArrowRight");
    assert.equal(document.activeElement, treeItem("e4"));
    await press(document.activeElement, "ArrowLeft");
    assert.deepEqual(toggles, ["e4"]);
    assert.equal(treeItem("e5"), undefined);
    assert.equal(document.activeElement, treeItem("e4"));
    await press(document.activeElement, "ArrowRight");
    assert.deepEqual(toggles, ["e4", "e4"]);
    assert.ok(treeItem("e5"));
    await press(document.activeElement, "ArrowRight");
    assert.equal(document.activeElement, treeItem("e5"));
    await press(document.activeElement, "ArrowLeft");
    assert.equal(document.activeElement, treeItem("e4"));

    await press(document.activeElement, "Enter");
    assert.deepEqual(selections, ["e4"]);
    assert.equal(treeItem("e4").getAttribute("aria-selected"), "true");
    await press(document.activeElement, "End");
    await press(document.activeElement, " ");
    assert.deepEqual(selections, ["e4", "d4"]);
    assert.equal(treeItem("d4").getAttribute("aria-selected"), "true");

    navigator.getBoundingClientRect = () => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      toJSON() {},
    });

    await act(async () => {
      navigator.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: 110,
        clientY: 70,
        detail: 1,
      }));
    });
    assert.equal(scrollCalls.at(-1).behavior, "auto");
    assert.equal(Number.isFinite(scrollCalls.at(-1).left), true);
    assert.equal(Number.isFinite(scrollCalls.at(-1).top), true);

    await press(navigator, "ArrowRight");
    assert.deepEqual(scrollCalls.at(-1), { left: 148, top: 80, behavior: "auto" });
    await press(navigator, "ArrowDown");
    assert.deepEqual(scrollCalls.at(-1), { left: 100, top: 128, behavior: "auto" });
    await press(navigator, "Home");
    assert.deepEqual(scrollCalls.at(-1), { left: 0, top: 0, behavior: "auto" });
    await press(navigator, "End");
    assert.deepEqual(scrollCalls.at(-1), { left: 1080, top: 800, behavior: "auto" });
    await press(navigator, "Enter");
    assert.equal(scrollCalls.at(-1).behavior, "auto");
    assert.equal(Number.isFinite(scrollCalls.at(-1).left), true);
    assert.equal(Number.isFinite(scrollCalls.at(-1).top), true);

    const toggleCount = toggles.length;
    await act(async () => {
      document.querySelector(".collapse-control").dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }));
    });
    assert.equal(toggles.length, toggleCount + 1);
    assert.equal(toggles.at(-1), "start");
  } finally {
    await act(async () => root.unmount());
    if (previousResizeObserver) {
      Object.defineProperty(globalThis, "ResizeObserver", previousResizeObserver);
    } else {
      delete globalThis.ResizeObserver;
    }
    environment.restore();
  }
});

test("reduced-motion, short-dialog scrolling, and collapse touch targets are explicit", async () => {
  assert.equal(REDUCED_MOTION_MEDIA_QUERY, "(prefers-reduced-motion: reduce)");
  assert.equal(prefersReducedMotion({ matches: true }), true);
  assert.equal(prefersReducedMotion({ matches: false }), false);
  assert.equal(prefersReducedMotion(null), false);

  const css = await readFile(new URL("app/globals.css", workspaceUrl), "utf8");
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*scroll-behavior:\s*auto\s*!important/);
  assert.match(css, /\.download-options\s*\{[\s\S]*?overflow-y:\s*auto/);
});
