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

export function revealSelectionAncestors(
  index: ReadonlyMap<string, TreeNode>,
  collapsedIds: Set<string>,
  selectedId: string,
  fallbackParentId: string | null = null,
): Set<string> {
  const selected = index.get(selectedId);
  let ancestorId = selected ? selected.parentId : fallbackParentId;
  if (!ancestorId) return collapsedIds;

  const next = new Set(collapsedIds);
  const visited = new Set<string>();
  let changed = false;

  while (ancestorId && !visited.has(ancestorId)) {
    visited.add(ancestorId);
    changed = next.delete(ancestorId) || changed;
    ancestorId = index.get(ancestorId)?.parentId ?? null;
  }

  return changed ? next : collapsedIds;
}
