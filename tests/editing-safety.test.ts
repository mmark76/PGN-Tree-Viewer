import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import {
  playBoardMove,
  promotionChoicesForMove,
  type PromotionPiece,
} from "../features/explorer/services/boardMove";
import {
  resolveSelectionAfterCollapse,
  revealSelectionAncestors,
} from "../features/explorer/services/treeSelection";
import type { TreeNode } from "../features/explorer/types";

const promotionFen = "7k/4P3/8/8/8/8/8/K7 w - - 0 1";
const blackPromotionFen = "k7/8/8/8/8/8/4p3/7K b - - 0 1";
const promotionSan: Record<PromotionPiece, string> = {
  q: "e8=Q+",
  r: "e8=R+",
  b: "e8=B",
  n: "e8=N",
};

test("finds and plays every legal promotion choice from a custom FEN", () => {
  const choices = promotionChoicesForMove(promotionFen, "e7", "e8");
  assert.deepEqual(choices, ["q", "r", "b", "n"]);

  for (const promotion of choices) {
    const played = playBoardMove(promotionFen, "e7", "e8", promotion);
    assert.equal(played?.promotion, promotion);
    assert.equal(played?.san, promotionSan[promotion]);
    assert.equal(new Chess(played?.fen).get("e8")?.type, promotion);
  }
});

test("supports all four legal black promotions from a custom FEN", () => {
  const choices = promotionChoicesForMove(blackPromotionFen, "e2", "e1");
  assert.deepEqual(choices, ["q", "r", "b", "n"]);

  for (const promotion of choices) {
    const played = playBoardMove(blackPromotionFen, "e2", "e1", promotion);
    assert.equal(played?.promotion, promotion);
    assert.equal(played?.san, `e1=${promotion.toUpperCase()}${promotion === "q" || promotion === "r" ? "+" : ""}`);
    assert.equal(new Chess(played?.fen).get("e1")?.type, promotion);
  }
});

test("does not silently choose a queen for a required promotion", () => {
  assert.equal(playBoardMove(promotionFen, "e7", "e8"), null);
  assert.equal(
    playBoardMove(promotionFen, "e7", "e8", "x" as PromotionPiece),
    null,
  );
});

test("keeps ordinary legal and illegal board moves compatible", () => {
  const startFen = new Chess().fen();
  const played = playBoardMove(startFen, "e2", "e4");

  assert.equal(played?.san, "e4");
  assert.equal(played?.promotion, undefined);
  assert.equal(playBoardMove(startFen, "e2", "e4", "q"), null);
  assert.equal(playBoardMove(startFen, "e2", "e5"), null);
  assert.deepEqual(promotionChoicesForMove(startFen, "e2", "e4"), []);
  assert.deepEqual(promotionChoicesForMove("not-a-fen", "e7", "e8"), []);
  assert.deepEqual(promotionChoicesForMove(startFen, "invalid", "e4"), []);
});

const totals = { white: 0, draw: 0, black: 0, unknown: 0 };

function treeNode(id: string, parentId: string | null, children: TreeNode[] = []): TreeNode {
  return {
    id,
    san: id === "start" ? "Start" : id,
    ply: parentId ? 1 : 0,
    fen: new Chess().fen(),
    parentId,
    move: null,
    results: { ...totals },
    openingTotals: {},
    children,
  };
}

test("moves a hidden descendant selection to the ancestor being collapsed", () => {
  const grandchild = treeNode("grandchild", "child");
  const child = treeNode("child", "branch", [grandchild]);
  const branch = treeNode("branch", "start", [child]);
  const sibling = treeNode("sibling", "start");
  const root = treeNode("start", null, [branch, sibling]);
  const index = new Map([root, branch, child, grandchild, sibling].map((node) => [node.id, node]));

  assert.equal(resolveSelectionAfterCollapse(index, "grandchild", "branch", true), "branch");
  assert.equal(resolveSelectionAfterCollapse(index, "branch", "branch", true), "branch");
  assert.equal(resolveSelectionAfterCollapse(index, "grandchild", "branch", false), "grandchild");
  assert.equal(resolveSelectionAfterCollapse(index, "sibling", "branch", true), "sibling");
});

test("preserves selection when the tree index is incomplete or cyclic", () => {
  const orphan = treeNode("orphan", "missing");
  const branch = treeNode("branch", "start");
  const cycleA = treeNode("cycle-a", "cycle-b");
  const cycleB = treeNode("cycle-b", "cycle-a");
  const index = new Map([orphan, branch, cycleA, cycleB].map((node) => [node.id, node]));

  assert.equal(resolveSelectionAfterCollapse(index, "orphan", "branch", true), "orphan");
  assert.equal(resolveSelectionAfterCollapse(index, "missing", "branch", true), "missing");
  assert.equal(resolveSelectionAfterCollapse(index, "cycle-a", "branch", true), "cycle-a");
});

test("reveals every collapsed ancestor before programmatic selection", () => {
  const grandchild = treeNode("grandchild", "child");
  const child = treeNode("child", "branch", [grandchild]);
  const branch = treeNode("branch", "start", [child]);
  const root = treeNode("start", null, [branch]);
  const index = new Map([root, branch, child, grandchild].map((node) => [node.id, node]));
  const collapsed = new Set(["start", "branch", "child", "unrelated"]);

  assert.deepEqual(
    revealSelectionAncestors(index, collapsed, "grandchild"),
    new Set(["unrelated"]),
  );
  assert.equal(revealSelectionAncestors(index, collapsed, "start"), collapsed);
  assert.deepEqual(
    revealSelectionAncestors(index, collapsed, "new-child", "branch"),
    new Set(["child", "unrelated"]),
  );
});
