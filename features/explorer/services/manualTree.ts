import type { PlayedBoardMove } from "./boardMove";
import { checkedAddNonNegativeIntegers, emptyResults } from "./lineIntegrity";
import type { TreeNode } from "../types";

/**
 * Appends one already-validated board move while cloning only its ancestor path.
 * The existing tree is never mutated and no chess positions are replayed.
 */
export function appendManualMoveToTree(
  root: TreeNode,
  parentId: string,
  played: PlayedBoardMove,
): TreeNode {
  const appended = appendAtNode(root, parentId, played);
  if (!appended) throw new Error("The selected tree node no longer exists.");
  return appended;
}

function appendAtNode(
  node: TreeNode,
  parentId: string,
  played: PlayedBoardMove,
): TreeNode | null {
  if (node.id === parentId) {
    if (node.children.some((child) => child.san === played.san)) return node;
    const moveKey = `${played.from}${played.to}${played.promotion ?? ""}`;
    const child: TreeNode = {
      id: `${node.id}-${moveKey}`,
      san: played.san,
      ply: checkedAddNonNegativeIntegers(node.ply, 1),
      fen: played.fen,
      parentId: node.id,
      move: { from: played.from, to: played.to },
      results: emptyResults(),
      openingTotals: { __manual__: 0 },
      children: [],
    };
    return { ...node, children: [...node.children, child] };
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const replacement = appendAtNode(node.children[index], parentId, played);
    if (replacement) {
      const children = [...node.children];
      children[index] = replacement;
      return { ...node, children };
    }
  }
  return null;
}
