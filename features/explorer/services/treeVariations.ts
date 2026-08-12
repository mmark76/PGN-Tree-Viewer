import type { TreeNode } from "../types";

export function expandableNodeIds(root: TreeNode) {
  const ids = new Set<string>();
  const visit = (node: TreeNode) => {
    if (node.children.length) ids.add(node.id);
    node.children.forEach(visit);
  };
  visit(root);
  return ids;
}

type TreeIndex = ReadonlyMap<string, TreeNode>;

function requiredExpandedAncestorIds(
  index: TreeIndex,
  rootId: string,
  selectedId: string,
) {
  const selected = index.get(selectedId) ?? index.get(rootId);
  const requiredExpanded = new Set<string>();
  let current = selected?.parentId ? index.get(selected.parentId) : undefined;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    requiredExpanded.add(current.id);
    current = current.parentId ? index.get(current.parentId) : undefined;
  }
  return requiredExpanded;
}

function requiredMainLineExpandedIds(index: TreeIndex, rootId: string) {
  const requiredExpanded = new Set<string>();
  const visited = new Set<string>();
  let current = index.get(rootId);

  while (current && !visited.has(current.id) && current.children.length) {
    visited.add(current.id);
    requiredExpanded.add(current.id);
    const mainLineChild = current.children[0];
    current = index.get(mainLineChild.id) ?? mainLineChild;
  }

  return requiredExpanded;
}

function requiredExpandedIds(index: TreeIndex, rootId: string, selectedId: string) {
  const requiredExpanded = requiredMainLineExpandedIds(index, rootId);
  requiredExpandedAncestorIds(index, rootId, selectedId)
    .forEach((id) => requiredExpanded.add(id));
  return requiredExpanded;
}

export function shrinkVariationIdsFromIndex(
  index: TreeIndex,
  expandableIds: ReadonlySet<string>,
  rootId: string,
  selectedId: string,
) {
  const collapsed = new Set(expandableIds);
  requiredExpandedIds(index, rootId, selectedId)
    .forEach((id) => collapsed.delete(id));
  return collapsed;
}

export function canShrinkVariations(
  index: TreeIndex,
  expandableIds: ReadonlySet<string>,
  collapsedIds: ReadonlySet<string>,
  rootId: string,
  selectedId: string,
) {
  const requiredExpanded = requiredExpandedIds(index, rootId, selectedId);
  for (const id of expandableIds) {
    if (collapsedIds.has(id) !== !requiredExpanded.has(id)) return true;
  }
  return false;
}

/**
 * Produces a compact main view without hiding the selected move.
 *
 * The visible spine always includes the complete main line (the first child at
 * each ply) as well as the root-to-selection path. Every other expandable node
 * remains visible at its branch entry, but its descendants are collapsed.
 */
export function shrinkVariationIds(root: TreeNode, selectedId: string) {
  const index = new Map<string, TreeNode>();
  const collect = (node: TreeNode) => {
    index.set(node.id, node);
    node.children.forEach(collect);
  };
  collect(root);

  return shrinkVariationIdsFromIndex(index, expandableNodeIds(root), root.id, selectedId);
}

export function sameCollapsedBranches(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
  expandableIds: ReadonlySet<string>,
) {
  for (const id of expandableIds) {
    if (left.has(id) !== right.has(id)) return false;
  }
  return true;
}
