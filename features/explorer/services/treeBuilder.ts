import { Chess } from "chess.js";
import type { LineRecord, ResultTotals, TreeNode } from "../types";

const emptyResults = (): ResultTotals => ({ white: 0, draw: 0, black: 0 });

const addResults = (target: ResultTotals, source: ResultTotals) => {
  target.white += source.white;
  target.draw += source.draw;
  target.black += source.black;
};

export const resultCount = (results: ResultTotals) =>
  results.white + results.draw + results.black;

export function dominantOpening(node: TreeNode) {
  return Object.entries(node.openingTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Αρχική θέση";
}

export function buildTree(lines: LineRecord[]): TreeNode {
  const chess = new Chess();
  const root: TreeNode = {
    id: "start",
    san: "Αρχική θέση",
    ply: 0,
    fen: chess.fen(),
    parentId: null,
    move: null,
    results: emptyResults(),
    openingTotals: {},
    children: [],
  };

  for (const line of lines) {
    chess.reset();
    let parent = root;
    const lineCount = resultCount(line.results);
    addResults(root.results, line.results);
    root.openingTotals[line.opening] = (root.openingTotals[line.opening] ?? 0) + lineCount;

    for (const moveText of line.moves) {
      const played = chess.move(moveText);
      if (!played) break;

      let child = parent.children.find((candidate) => candidate.san === played.san);
      if (!child) {
        const moveKey = `${played.from}${played.to}${played.promotion ?? ""}`;
        child = {
          id: `${parent.id}-${moveKey}`,
          san: played.san,
          ply: parent.ply + 1,
          fen: chess.fen(),
          parentId: parent.id,
          move: { from: played.from, to: played.to },
          results: emptyResults(),
          openingTotals: {},
          children: [],
        };
        parent.children.push(child);
      }

      addResults(child.results, line.results);
      child.openingTotals[line.opening] = (child.openingTotals[line.opening] ?? 0) + lineCount;
      parent = child;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => resultCount(b.results) - resultCount(a.results));
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
