import assert from "node:assert/strict";
import test from "node:test";
import {
  COLLAPSE_CONTROL_NODE_OFFSET,
  getCollapseControlPosition,
  getNavigatorKeyCommand,
  getNavigatorLensPercentage,
  getNavigatorTreePoint,
  getTreeKeyboardAction,
  getVisibleTreeItems,
  MIN_POINTER_COLLAPSE_ZOOM,
  shouldShowPointerCollapseControls,
} from "../features/explorer/services/treeNavigation";
import type { TreeNode } from "../features/explorer/types";
import {
  canShrinkVariations,
  expandableNodeIds,
  sameCollapsedBranches,
  shrinkVariationIds,
} from "../features/explorer/services/treeVariations";

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

test("navigator coordinates map exactly and clamp the moving lens to its bounds", () => {
  const bounds = { left: 10, top: 20, width: 200, height: 100 };
  assert.deepEqual(getNavigatorTreePoint(bounds, 110, 70, 860, 650), { x: 430, y: 325 });
  assert.deepEqual(getNavigatorTreePoint(bounds, -100, 500, 860, 650), { x: 0, y: 650 });
  assert.equal(getNavigatorTreePoint({ ...bounds, width: 0 }, 10, 20, 860, 650), null);
  assert.equal(getNavigatorTreePoint(bounds, Number.NaN, 20, 860, 650), null);
  assert.equal(getNavigatorLensPercentage(-10, 860), 0);
  assert.equal(getNavigatorLensPercentage(430, 860), 50);
  assert.equal(getNavigatorLensPercentage(900, 860), 100);
  assert.equal(getNavigatorLensPercentage(Number.NaN, 860), 50);
});

test("recursive expand and shrink retain a visible selected path", () => {
  const root = fixtureTree();
  const expandable = expandableNodeIds(root);
  assert.deepEqual([...expandable], ["start", "a", "a1"]);

  const selectedVariation = shrinkVariationIds(root, "a2");
  const treeIndex = new Map<string, TreeNode>();
  const index = (item: TreeNode) => {
    treeIndex.set(item.id, item);
    item.children.forEach(index);
  };
  index(root);
  assert.equal(canShrinkVariations(treeIndex, expandable, new Set(), root.id, "a2"), true);
  assert.equal(
    canShrinkVariations(treeIndex, expandable, selectedVariation, root.id, "a2"),
    false,
  );
  assert.deepEqual([...selectedVariation], ["a1"]);
  assert.deepEqual(
    getVisibleTreeItems(root, selectedVariation).map(({ node: item }) => item.id),
    ["start", "a", "a1", "a2", "b"],
  );
  assert.equal(
    getVisibleTreeItems(root, selectedVariation).some(({ node: item }) => item.id === "a2"),
    true,
  );

  const selectedBranch = shrinkVariationIds(root, "a");
  assert.deepEqual([...selectedBranch], ["a", "a1"]);
  assert.deepEqual(
    getVisibleTreeItems(root, selectedBranch).map(({ node: item }) => item.id),
    ["start", "a", "b"],
  );
  assert.equal(
    getVisibleTreeItems(root, selectedBranch).some(({ node: item }) => item.id === "a"),
    true,
  );

  const selectedRoot = shrinkVariationIds(root, "start");
  assert.deepEqual([...selectedRoot], ["start", "a", "a1"]);
  assert.deepEqual(
    getVisibleTreeItems(root, selectedRoot).map(({ node: item }) => item.id),
    ["start"],
  );
  assert.equal(sameCollapsedBranches(new Set(), selectedRoot, expandable), false);
  assert.equal(sameCollapsedBranches(new Set(["start", "a", "a1"]), selectedRoot, expandable), true);

  const missingSelection = shrinkVariationIds(root, "missing");
  assert.deepEqual([...missingSelection], ["start", "a", "a1"]);
});
