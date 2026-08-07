import type { PositionedNode, TreeEdge, TreeNode } from "../types";
import { resultCount } from "./treeBuilder";

const horizontalGap = 190;
const verticalGap = 90;
const marginX = 94;
const marginY = 62;

export function layoutTree(root: TreeNode, collapsedIds: Set<string>) {
  const positioned = new Map<string, PositionedNode>();
  let nextLeaf = 0;

  const place = (node: TreeNode, parentCount: number): number => {
    const children = collapsedIds.has(node.id) ? [] : node.children;
    const childYs = children.map((child) => place(child, resultCount(node.results)));
    const y = childYs.length
      ? (Math.min(...childYs) + Math.max(...childYs)) / 2
      : marginY + nextLeaf++ * verticalGap;

    positioned.set(node.id, {
      ...node,
      x: marginX + node.ply * horizontalGap,
      y,
      parentCount,
    });
    return y;
  };

  place(root, resultCount(root.results));
  const nodes = [...positioned.values()];
  const edges: TreeEdge[] = [];
  for (const node of nodes) {
    if (!node.parentId) continue;
    const parent = positioned.get(node.parentId);
    if (parent) edges.push({ from: parent, to: node });
  }

  return {
    nodes,
    edges,
    width: Math.max(860, ...nodes.map((node) => node.x + 110)),
    height: Math.max(650, marginY * 2 + Math.max(1, nextLeaf - 1) * verticalGap),
  };
}
