import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { JSDOM } from "jsdom";
import { SettingsPanel } from "../features/explorer/components/SettingsPanel.tsx";
import {
  contrastRatio,
  DEFAULT_SETTINGS,
  getNotationColor,
  MIN_ACCENT_CONTRAST,
  MIN_SQUARE_CONTRAST,
  normalizeSettings,
} from "../features/explorer/settings.ts";

function installDom() {
  const dom = new JSDOM(
    "<!doctype html><html lang=\"en\"><body><button id=\"opener\">Open</button><div id=\"host\"></div></body></html>",
    { url: "https://example.test/" },
  );
  dom.window.HTMLElement.prototype.attachEvent = () => undefined;
  dom.window.HTMLElement.prototype.detachEvent = () => undefined;

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

async function changeColor(input, value) {
  assert.ok(input instanceof HTMLInputElement, "expected a color input");
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  assert.ok(valueSetter, "expected the native input value setter");
  await act(async () => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function click(element) {
  assert.ok(element, "expected an interactive element");
  await act(async () => {
    element.click();
  });
}

test("mounted color drafts expose ARIA errors and propagate only when the complete palette is safe", async () => {
  const environment = installDom();
  const { createRoot } = await import("react-dom/client");
  const host = document.querySelector("#host");
  const root = createRoot(host);
  const changes = [];

  function Harness() {
    const [settings, setSettings] = React.useState({ ...DEFAULT_SETTINGS });
    return React.createElement(SettingsPanel, {
      locale: "en",
      settings,
      onChange(nextSettings) {
        changes.push(nextSettings);
        setSettings(nextSettings);
      },
      onClose() {},
    });
  }

  try {
    document.querySelector("#opener").focus();
    await act(async () => {
      root.render(React.createElement(Harness));
    });

    const inputs = Array.from(document.querySelectorAll('input[type="color"]'));
    assert.equal(inputs.length, 3);
    const [accentInput, lightInput] = inputs;

    await changeColor(accentInput, "#ffffff");
    assert.equal(changes.length, 0, "an unsafe accent must remain only a local draft");
    assert.equal(accentInput.value, "#ffffff");
    assert.equal(accentInput.getAttribute("aria-invalid"), "true");
    const accentErrorId = accentInput.getAttribute("aria-describedby");
    assert.ok(accentErrorId);
    const accentError = document.getElementById(accentErrorId);
    assert.equal(accentError?.getAttribute("role"), "alert");
    assert.match(accentError?.textContent ?? "", /contrast/i);

    await changeColor(lightInput, "#777777");
    assert.equal(changes.length, 0, "fixing neither invalid group must not leak a partial palette");
    assert.equal(lightInput.getAttribute("aria-invalid"), "true");
    const squareErrorId = lightInput.getAttribute("aria-describedby");
    assert.ok(squareErrorId);
    const squareError = document.getElementById(squareErrorId);
    assert.equal(squareError?.getAttribute("role"), "alert");
    assert.equal(inputs[2].getAttribute("aria-describedby"), squareErrorId);

    await changeColor(accentInput, "#000000");
    assert.equal(changes.length, 0, "a safe accent must still wait for the square pair");
    assert.equal(accentInput.getAttribute("aria-invalid"), "false");
    assert.equal(accentInput.hasAttribute("aria-describedby"), false);

    await changeColor(lightInput, "#ffffff");
    assert.equal(changes.length, 1);
    assert.deepEqual(changes[0], {
      ...DEFAULT_SETTINGS,
      accentColor: "#000000",
      lightSquareColor: "#ffffff",
    });
    assert.equal(inputs.every((input) => input.getAttribute("aria-invalid") === "false"), true);
    assert.equal(document.querySelector(".color-settings-errors"), null);

    const resetButton = Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Reset");
    await click(resetButton);
    assert.equal(changes.length, 2);
    assert.deepEqual(changes[1], DEFAULT_SETTINGS);
    assert.deepEqual(
      inputs.map((input) => input.value),
      [
        DEFAULT_SETTINGS.accentColor,
        DEFAULT_SETTINGS.lightSquareColor,
        DEFAULT_SETTINGS.darkSquareColor,
      ],
    );
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});

test("mounted color drafts resynchronize after an external settings replacement", async () => {
  const environment = installDom();
  const { createRoot } = await import("react-dom/client");
  const host = document.querySelector("#host");
  const root = createRoot(host);
  let replaceSettings = null;
  const reactWarnings = [];
  const previousConsoleError = console.error;
  console.error = (...args) => {
    reactWarnings.push(args.map(String).join(" "));
  };

  function Harness() {
    const [settings, setSettings] = React.useState({ ...DEFAULT_SETTINGS });
    replaceSettings = setSettings;
    return React.createElement(SettingsPanel, {
      locale: "en",
      settings,
      onChange: setSettings,
      onClose() {},
    });
  }

  try {
    await act(async () => {
      root.render(React.createElement(Harness));
    });
    const inputs = Array.from(document.querySelectorAll('input[type="color"]'));
    await changeColor(inputs[0], "#ffffff");
    assert.equal(inputs[0].value, "#ffffff", "the unsafe local draft should be visible first");

    const replacement = {
      accentColor: "#000000",
      lightSquareColor: "#ffffff",
      darkSquareColor: "#000000",
      textSize: "large",
      boardSize: "standard",
      font: "modern",
      treeDirection: "down",
    };
    await act(async () => {
      replaceSettings(replacement);
    });

    assert.deepEqual(
      inputs.map((input) => input.value),
      [replacement.accentColor, replacement.lightSquareColor, replacement.darkSquareColor],
    );
    assert.equal(document.querySelector(".color-settings-errors"), null);

    await changeColor(inputs[0], "#ffffff");
    assert.equal(inputs[0].getAttribute("aria-invalid"), "true");
    await act(async () => {
      replaceSettings({ ...DEFAULT_SETTINGS });
    });
    assert.deepEqual(
      inputs.map((input) => input.value),
      [
        DEFAULT_SETTINGS.accentColor,
        DEFAULT_SETTINGS.lightSquareColor,
        DEFAULT_SETTINGS.darkSquareColor,
      ],
      "the A → B → A cycle must not resurrect either invalid local draft",
    );
    assert.equal(document.querySelector(".color-settings-errors"), null);
    assert.deepEqual(
      reactWarnings.filter((message) => /setstate|cannot update|while rendering|render phase/i.test(message)),
      [],
      "same-component draft reconciliation must not emit React render warnings",
    );
  } finally {
    await act(async () => root.unmount());
    console.error = previousConsoleError;
    environment.restore();
  }
});

test("normalization rejects contrast attacks and notation always receives a readable foreground", () => {
  const attacked = normalizeSettings({
    accentColor: "#ffffff",
    lightSquareColor: "#777777",
    darkSquareColor: "#787878",
    textSize: "large",
    boardSize: "standard",
    font: "modern",
    treeDirection: "down",
  });
  assert.deepEqual(attacked, {
    ...DEFAULT_SETTINGS,
    textSize: "large",
    boardSize: "standard",
    font: "modern",
    treeDirection: "down",
  });
  assert.ok(contrastRatio(attacked.accentColor, "#ffffff") >= MIN_ACCENT_CONTRAST);
  assert.ok(
    contrastRatio(attacked.lightSquareColor, attacked.darkSquareColor) >= MIN_SQUARE_CONTRAST,
  );

  for (const squareColor of ["#000000", "#ffffff", "#777777", "#173f32", "#f0d9b5", "#6f8f72"]) {
    const foreground = getNotationColor(squareColor);
    assert.ok(
      contrastRatio(squareColor, foreground) >= MIN_ACCENT_CONTRAST,
      `${foreground} should remain readable on ${squareColor}`,
    );
  }
});
