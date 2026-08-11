import assert from "node:assert/strict";
import test from "node:test";
import {
  COLLAPSE_CONTROL_NODE_OFFSET,
  getCollapseControlPosition,
  getNavigatorKeyCommand,
  getTreeKeyboardAction,
  getVisibleTreeItems,
  MIN_POINTER_COLLAPSE_ZOOM,
  shouldShowPointerCollapseControls,
} from "../features/explorer/services/treeNavigation";
import type { TreeNode } from "../features/explorer/types";

const emptyResults = () => ({ white: 0, draw: 0, black: 0, unknown: 0 });

function node(
  id: string,
  parentId: string | null,
  children: TreeNode[] = [],
): TreeNode {
  return {
    id,
    parentId,
    children,
    san: id === "start" ? "" : id,
    ply: parentId === null ? 0 : 1,
    fen: "fixture-fen",
    move: null,
    results: emptyResults(),
    openingTotals: Object.create(null) as Record<string, number>,
  };
}

function fixtureTree() {
  const a1a = node("a1a", "a1");
  const a1 = node("a1", "a", [a1a]);
  const a2 = node("a2", "a");
  const a = node("a", "start", [a1, a2]);
  const b = node("b", "start");
  return node("start", null, [a, b]);
}

test("visible tree metadata is preorder, one-based, and excludes collapsed descendants", () => {
  const root = fixtureTree();
  const expanded = getVisibleTreeItems(root, new Set());

  assert.deepEqual(
    expanded.map(({ node: item, level, posInSet, setSize }) => ({
      id: item.id,
      level,
      posInSet,
      setSize,
    })),
    [
      { id: "start", level: 1, posInSet: 1, setSize: 1 },
      { id: "a", level: 2, posInSet: 1, setSize: 2 },
      { id: "a1", level: 3, posInSet: 1, setSize: 2 },
      { id: "a1a", level: 4, posInSet: 1, setSize: 1 },
      { id: "a2", level: 3, posInSet: 2, setSize: 2 },
      { id: "b", level: 2, posInSet: 2, setSize: 2 },
    ],
  );

  assert.deepEqual(
    getVisibleTreeItems(root, new Set(["a"])).map(({ node: item }) => item.id),
    ["start", "a", "b"],
  );
});

test("tree keyboard navigation follows the visible preorder and ARIA tree conventions", () => {
  const root = fixtureTree();
  const expanded = getVisibleTreeItems(root, new Set());

  assert.deepEqual(getTreeKeyboardAction(expanded, "start", "ArrowUp", new Set()), {});
  assert.deepEqual(getTreeKeyboardAction(expanded, "start", "ArrowDown", new Set()), { focusId: "a" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "a2", "Home", new Set()), { focusId: "start" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "a2", "End", new Set()), { focusId: "b" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "a", "ArrowRight", new Set()), { focusId: "a1" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "a", "ArrowLeft", new Set()), { toggleId: "a" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "a1a", "ArrowLeft", new Set()), { focusId: "a1" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "b", "Enter", new Set()), { selectId: "b" });
  assert.deepEqual(getTreeKeyboardAction(expanded, "b", " ", new Set()), { selectId: "b" });

  const collapsedIds = new Set(["a"]);
  const collapsed = getVisibleTreeItems(root, collapsedIds);
  assert.deepEqual(getTreeKeyboardAction(collapsed, "a", "ArrowRight", collapsedIds), { toggleId: "a" });
  assert.deepEqual(getTreeKeyboardAction(collapsed, "a", "ArrowLeft", collapsedIds), { focusId: "start" });
  assert.equal(getTreeKeyboardAction(collapsed, "missing", "ArrowDown", collapsedIds), null);
  assert.equal(getTreeKeyboardAction(collapsed, "a", "Tab", collapsedIds), null);
});

test("navigator keyboard commands cover arrows, bounds, and activation keys", () => {
  assert.deepEqual(
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter", " ", "Spacebar"]
      .map((key) => getNavigatorKeyCommand(key)),
    [
      "pan-left",
      "pan-right",
      "pan-up",
      "pan-down",
      "start",
      "end",
      "center-selected",
      "center-selected",
      "center-selected",
    ],
  );
  assert.equal(getNavigatorKeyCommand("Tab"), null);
});

test("pointer collapse controls stay unscaled at the readable zoom boundary", () => {
  assert.equal(MIN_POINTER_COLLAPSE_ZOOM, 0.5);
  assert.equal(COLLAPSE_CONTROL_NODE_OFFSET, 30);
  assert.equal(shouldShowPointerCollapseControls(0.499), false);
  assert.equal(shouldShowPointerCollapseControls(0.5), true);
  assert.equal(shouldShowPointerCollapseControls(0.67), true);
  assert.equal(shouldShowPointerCollapseControls(Number.NaN), false);

  const positionedNode = { x: 100, y: 200 };
  assert.deepEqual(getCollapseControlPosition(positionedNode, 0.67, "right"), {
    left: (100 + 30) * 0.67,
    top: 200 * 0.67,
  });
  assert.deepEqual(getCollapseControlPosition(positionedNode, 0.67, "down"), {
    left: 100 * 0.67,
    top: (200 + 30) * 0.67,
  });
});
