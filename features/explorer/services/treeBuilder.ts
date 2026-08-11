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
import {
  assertLineCollectionWithinLimits,
  assertWithinInputLimit,
  type InputLimitOverrides,
  type InputLimits,
  resolveInputLimits,
} from "./inputLimits";

export { gameCount, knownResultCount, resultPercentages } from "./lineIntegrity";

export const resultCount = gameCount;

export type PreparedTreeMove = {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  beforeFen: string;
  afterFen: string;
};

export type PreparedTreeLine = {
  line: LineRecord;
  moves: PreparedTreeMove[];
};

export function popularityPercentage(results: ResultTotals, parentCount: number) {
  const total = gameCount(results);
  if (!total || !parentCount) return null;
  return Math.round((total / parentCount) * 100);
}

export function dominantOpening(node: TreeNode) {
  return Object.entries(node.openingTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Αρχική θέση";
}

export function buildTree(
  lines: LineRecord[],
  limitOverrides: InputLimitOverrides = {},
): TreeNode {
  const limits = resolveInputLimits(limitOverrides);
  const startFen = validateTreeInput(lines, limits);
  const chess = new Chess(startFen);
  return buildTreeWithMoves(lines, startFen, limits, (line) => {
    chess.load(startFen);
    return replayMoves(chess, line.moves);
  });
}

export function buildTreeFromPreparedLines(
  preparedLines: readonly PreparedTreeLine[],
  limitOverrides: InputLimitOverrides = {},
): TreeNode {
  const limits = resolveInputLimits(limitOverrides);
  const lines = preparedLines.map(({ line }) => line);
  const startFen = validateTreeInput(lines, limits);
  return buildTreeWithMoves(lines, startFen, limits, (_line, index) =>
    validatePreparedMoves(preparedLines[index], startFen),
  );
}

function validateTreeInput(lines: readonly LineRecord[], limits: InputLimits) {
  assertLineCollectionWithinLimits(lines, limits);
  const startFen = assertSingleStartFen(lines);
  assertAggregateTotalsSafe(lines);
  return startFen;
}

function buildTreeWithMoves(
  lines: readonly LineRecord[],
  startFen: string,
  limits: InputLimits,
  movesForLine: (line: LineRecord, index: number) => Iterable<PreparedTreeMove>,
) {
  assertWithinInputLimit("node-count", 1, limits.maxNodes);
  let nodeCount = 1;
  const root: TreeNode = {
    id: "start",
    san: "Αρχική θέση",
    ply: startPlyFromFen(startFen),
    fen: startFen,
    parentId: null,
    move: null,
    results: emptyResults(),
    openingTotals: Object.create(null) as Record<string, number>,
    children: [],
  };
  const childIndexes = new WeakMap<TreeNode, Map<string, TreeNode>>();

  for (const [lineIndex, line] of lines.entries()) {
    let parent = root;
    const lineCount = gameCount(line.results);
    addResults(root.results, line.results);
    root.openingTotals[line.opening] = checkedAddNonNegativeIntegers(
      root.openingTotals[line.opening] ?? 0,
      lineCount,
    );

    let moveCount = 0;
    for (const played of movesForLine(line, lineIndex)) {
      moveCount += 1;
      const childIndex = childIndexFor(parent, childIndexes);
      let child = childIndex.get(played.san);
      if (!child) {
        assertWithinInputLimit("node-count", nodeCount + 1, limits.maxNodes);
        const moveKey = `${played.from}${played.to}${played.promotion ?? ""}`;
        child = {
          id: `${parent.id}-${moveKey}`,
          san: played.san,
          ply: checkedAddNonNegativeIntegers(parent.ply, 1),
          fen: played.afterFen,
          parentId: parent.id,
          move: { from: played.from, to: played.to },
          results: emptyResults(),
          openingTotals: Object.create(null) as Record<string, number>,
          children: [],
        };
        nodeCount += 1;
        childIndex.set(played.san, child);
        parent.children.push(child);
      }

      addResults(child.results, line.results);
      child.openingTotals[line.opening] = checkedAddNonNegativeIntegers(
        child.openingTotals[line.opening] ?? 0,
        lineCount,
      );
      parent = child;
    }
    if (moveCount !== line.moves.length) throw new Error("Invalid prepared move sequence.");
  }

  sortTree(root);
  return root;
}

function childIndexFor(
  parent: TreeNode,
  childIndexes: WeakMap<TreeNode, Map<string, TreeNode>>,
) {
  let childIndex = childIndexes.get(parent);
  if (!childIndex) {
    childIndex = new Map(parent.children.map((child) => [child.san, child]));
    childIndexes.set(parent, childIndex);
  }
  return childIndex;
}

function* replayMoves(chess: Chess, moves: readonly string[]): Iterable<PreparedTreeMove> {
  for (const moveText of moves) {
    try {
      const played = chess.move(moveText);
      if (!played) throw new Error("Illegal move in line input.");
      yield {
        san: played.san,
        from: played.from,
        to: played.to,
        promotion: played.promotion,
        beforeFen: played.before,
        afterFen: played.after,
      };
    } catch {
      throw new Error("Illegal move in line input.");
    }
  }
}

function* validatePreparedMoves(
  preparedLine: PreparedTreeLine | undefined,
  startFen: string,
): Iterable<PreparedTreeMove> {
  if (!preparedLine || preparedLine.moves.length !== preparedLine.line.moves.length) {
    throw new Error("Invalid prepared move sequence.");
  }

  let expectedBeforeFen = startFen;
  for (const [index, move] of preparedLine.moves.entries()) {
    if (
      move.san !== preparedLine.line.moves[index]
      || move.beforeFen !== expectedBeforeFen
      || !move.afterFen
      || !move.from
      || !move.to
    ) {
      throw new Error("Invalid prepared move sequence.");
    }
    expectedBeforeFen = move.afterFen;
    yield move;
  }
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
