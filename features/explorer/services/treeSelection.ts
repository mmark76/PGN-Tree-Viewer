import type { TreeNode } from "../types";

export function resolveSelectionAfterCollapse(
  index: ReadonlyMap<string, TreeNode>,
  selectedId: string,
  collapsedId: string,
  isCollapsing: boolean,
): string {
  if (!isCollapsing || selectedId === collapsedId) return selectedId;
  if (!index.has(selectedId) || !index.has(collapsedId)) return selectedId;

  const visited = new Set<string>();
  let current = index.get(selectedId);

  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentId === collapsedId) return collapsedId;
    current = index.get(current.parentId);
  }

  return selectedId;
}
