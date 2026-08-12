import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTreeResizeBounds,
  clampTreePanelSize,
  resizeTreePanel,
  resizeTreePanelFromKey,
  TREE_RESIZE_KEYBOARD_STEP,
} from "../features/explorer/services/treePanelResize";

const bounds = { minWidth: 360, maxWidth: 920, minHeight: 360, maxHeight: 800 };

test("bounds use workspace content width and the section's remaining viewport height", () => {
  assert.deepEqual(calculateTreeResizeBounds({
    workspaceWidth: 1100,
    horizontalPadding: 40,
    inspectorWidth: 320,
    gap: 10,
    viewportHeight: 768,
    sectionTop: 120,
    stacked: false,
  }), {
    minWidth: 360,
    maxWidth: 730,
    minHeight: 360,
    maxHeight: 632,
  });

  assert.deepEqual(calculateTreeResizeBounds({
    workspaceWidth: 340,
    horizontalPadding: 20,
    inspectorWidth: 320,
    gap: 14,
    viewportHeight: 300,
    sectionTop: 80,
    stacked: true,
  }), {
    minWidth: 320,
    maxWidth: 320,
    minHeight: 204,
    maxHeight: 204,
  });
});

test("pointer resize changes each axis independently and clamps to viewport bounds", () => {
  assert.deepEqual(resizeTreePanel(
    { width: 700, height: 600 },
    { x: 80, y: -50 },
    "both",
    bounds,
  ), { width: 780, height: 550 });
  assert.deepEqual(resizeTreePanel(
    { width: 700, height: 600 },
    { x: -999, y: 999 },
    "width",
    bounds,
  ), { width: 360, height: 600 });
  assert.deepEqual(resizeTreePanel(
    { width: 700, height: 600 },
    { x: 999, y: -999 },
    "height",
    bounds,
  ), { width: 700, height: 360 });
  assert.deepEqual(clampTreePanelSize(
    { width: Number.NaN, height: Number.POSITIVE_INFINITY },
    bounds,
  ), { width: 360, height: 360 });
});

test("keyboard resize supports arrows, Home, End, and larger steps", () => {
  const current = { width: 700, height: 600 };
  assert.equal(TREE_RESIZE_KEYBOARD_STEP, 24);
  assert.deepEqual(resizeTreePanelFromKey(current, "ArrowLeft", "width", bounds), {
    width: 676,
    height: 600,
  });
  assert.deepEqual(resizeTreePanelFromKey(current, "ArrowDown", "height", bounds), {
    width: 700,
    height: 624,
  });
  assert.deepEqual(resizeTreePanelFromKey(current, "ArrowRight", "both", bounds, 64), {
    width: 764,
    height: 600,
  });
  assert.deepEqual(resizeTreePanelFromKey(current, "Home", "both", bounds), {
    width: 360,
    height: 360,
  });
  assert.deepEqual(resizeTreePanelFromKey(current, "End", "both", bounds), {
    width: 920,
    height: 800,
  });
  assert.equal(resizeTreePanelFromKey(current, "Enter", "both", bounds), null);
});
