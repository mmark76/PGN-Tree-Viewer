import type { PositionedNode, TreeEdge, TreeNode } from "../types";
import { resultCount } from "./treeBuilder";
import type { TreeDirection } from "../settings";

const horizontalGap = 82;
const verticalGap = 70;
const marginX = 54;
const marginY = 48;

export const MIN_TREE_ZOOM = 0.02;
export const MAX_TREE_ZOOM = 1.2;

export function fitTreeZoom(
  treeWidth: number,
  treeHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 28,
) {
  if (treeWidth <= 0 || treeHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return 1;

  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const fitted = Math.min(1, availableWidth / treeWidth, availableHeight / treeHeight);
  return Math.max(MIN_TREE_ZOOM, Math.floor(fitted * 1000) / 1000);
}

export function layoutTree(root: TreeNode, collapsedIds: Set<string>, direction: TreeDirection = "right") {
  const positioned = new Map<string, PositionedNode>();
  let nextLeaf = 0;

  const place = (node: TreeNode, parentCount: number): number => {
    const children = collapsedIds.has(node.id) ? [] : node.children;
    const childYs = children.map((child) => place(child, resultCount(node.results)));
    const crossPosition = childYs.length
      ? (Math.min(...childYs) + Math.max(...childYs)) / 2
      : marginY + nextLeaf++ * verticalGap;

    const x = direction === "right" ? marginX + node.ply * horizontalGap : marginX + nextLeafPosition(crossPosition) * horizontalGap;
    const y = direction === "right" ? crossPosition : marginY + node.ply * verticalGap;

    positioned.set(node.id, {
      ...node,
      x,
      y,
      parentCount,
    });
    return crossPosition;
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
    width: direction === "right"
      ? Math.max(860, ...nodes.map((node) => node.x + 54))
      : Math.max(860, ...nodes.map((node) => node.x + 54)),
    height: direction === "right"
      ? Math.max(650, marginY * 2 + Math.max(1, nextLeaf - 1) * verticalGap)
      : Math.max(650, ...nodes.map((node) => node.y + 54)),
  };
}

function nextLeafPosition(verticalPosition: number) {
  return (verticalPosition - marginY) / verticalGap;
}
