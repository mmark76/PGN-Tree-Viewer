import { Chess } from "chess.js";
import type { LineRecord, ResultTotals, TreeNode } from "../types";
import {
  addResults,
  assertAggregateTotalsSafe,
  assertSingleStartFen,
  checkedAddNonNegativeIntegers,
  emptyResults,
  gameCount,
  startPlyFromFen,
} from "./lineIntegrity";

export { gameCount, knownResultCount, resultPercentages } from "./lineIntegrity";

export const resultCount = gameCount;

export function popularityPercentage(results: ResultTotals, parentCount: number) {
  const total = gameCount(results);
  if (!total || !parentCount) return null;
  return Math.round((total / parentCount) * 100);
}

export function dominantOpening(node: TreeNode) {
  return Object.entries(node.openingTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Αρχική θέση";
}

export function buildTree(lines: LineRecord[]): TreeNode {
  const startFen = assertSingleStartFen(lines);
  assertAggregateTotalsSafe(lines);
  const chess = new Chess(startFen);
  const root: TreeNode = {
    id: "start",
    san: "Αρχική θέση",
    ply: startPlyFromFen(startFen),
    fen: chess.fen(),
    parentId: null,
    move: null,
    results: emptyResults(),
    openingTotals: Object.create(null) as Record<string, number>,
    children: [],
  };

  for (const line of lines) {
    chess.load(startFen);
    let parent = root;
    const lineCount = gameCount(line.results);
    addResults(root.results, line.results);
    root.openingTotals[line.opening] = checkedAddNonNegativeIntegers(
      root.openingTotals[line.opening] ?? 0,
      lineCount,
    );

    for (const moveText of line.moves) {
      const played = chess.move(moveText);
      if (!played) break;

      let child = parent.children.find((candidate) => candidate.san === played.san);
      if (!child) {
        const moveKey = `${played.from}${played.to}${played.promotion ?? ""}`;
        child = {
          id: `${parent.id}-${moveKey}`,
          san: played.san,
          ply: checkedAddNonNegativeIntegers(parent.ply, 1),
          fen: chess.fen(),
          parentId: parent.id,
          move: { from: played.from, to: played.to },
          results: emptyResults(),
          openingTotals: Object.create(null) as Record<string, number>,
          children: [],
        };
        parent.children.push(child);
      }

      addResults(child.results, line.results);
      child.openingTotals[line.opening] = checkedAddNonNegativeIntegers(
        child.openingTotals[line.opening] ?? 0,
        lineCount,
      );
      parent = child;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => gameCount(b.results) - gameCount(a.results));
  node.children.forEach(sortTree);
}

export function indexTree(root: TreeNode) {
  const nodes = new Map<string, TreeNode>();
  const visit = (node: TreeNode) => {
    nodes.set(node.id, node);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
}

export function pathToNode(node: TreeNode, index: Map<string, TreeNode>) {
  const moves: string[] = [];
  let current: TreeNode | undefined = node;
  while (current && current.parentId) {
    moves.unshift(current.san);
    current = index.get(current.parentId);
  }
  return moves;
}
