import type { PositionedNode, TreeNode } from "../types";
import type { TreeDirection } from "../settings";

// Below 50%, adjacent 44px controls overlap too heavily to identify reliably.
// Tree-item Left/Right keyboard expansion remains available at every zoom.
export const MIN_POINTER_COLLAPSE_ZOOM = 0.5;
export const COLLAPSE_CONTROL_NODE_OFFSET = 30;

export type VisibleTreeItem = {
  node: TreeNode;
  level: number;
  posInSet: number;
  setSize: number;
};

export type TreeKeyboardAction = {
  focusId?: string;
  toggleId?: string;
  selectId?: string;
};

export type NavigatorKeyCommand =
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down"
  | "start"
  | "end"
  | "center-selected";

export function getVisibleTreeItems(root: TreeNode, collapsedIds: ReadonlySet<string>) {
  const items: VisibleTreeItem[] = [];

  const visit = (node: TreeNode, level: number, posInSet: number, setSize: number) => {
    items.push({ node, level, posInSet, setSize });
    if (collapsedIds.has(node.id)) return;

    node.children.forEach((child, index) => {
      visit(child, level + 1, index + 1, node.children.length);
    });
  };

  visit(root, 1, 1, 1);
  return items;
}

export function getTreeKeyboardAction(
  items: readonly VisibleTreeItem[],
  focusedId: string,
  key: string,
  collapsedIds: ReadonlySet<string>,
): TreeKeyboardAction | null {
  const currentIndex = items.findIndex(({ node }) => node.id === focusedId);
  if (currentIndex < 0) return null;

  const current = items[currentIndex];
  if (key === "ArrowUp") {
    return currentIndex > 0 ? { focusId: items[currentIndex - 1].node.id } : {};
  }
  if (key === "ArrowDown") {
    return currentIndex < items.length - 1 ? { focusId: items[currentIndex + 1].node.id } : {};
  }
  if (key === "Home") return { focusId: items[0].node.id };
  if (key === "End") return { focusId: items[items.length - 1].node.id };

  if (key === "ArrowRight") {
    if (!current.node.children.length) return {};
    if (collapsedIds.has(current.node.id)) return { toggleId: current.node.id };
    return { focusId: current.node.children[0].id };
  }

  if (key === "ArrowLeft") {
    if (current.node.children.length && !collapsedIds.has(current.node.id)) {
      return { toggleId: current.node.id };
    }
    return current.node.parentId ? { focusId: current.node.parentId } : {};
  }

  if (key === "Enter" || key === " " || key === "Spacebar") {
    return { selectId: current.node.id };
  }

  return null;
}

export function getNavigatorKeyCommand(key: string): NavigatorKeyCommand | null {
  if (key === "ArrowLeft") return "pan-left";
  if (key === "ArrowRight") return "pan-right";
  if (key === "ArrowUp") return "pan-up";
  if (key === "ArrowDown") return "pan-down";
  if (key === "Home") return "start";
  if (key === "End") return "end";
  if (key === "Enter" || key === " " || key === "Spacebar") return "center-selected";
  return null;
}

export function shouldShowPointerCollapseControls(zoom: number) {
  return Number.isFinite(zoom) && zoom >= MIN_POINTER_COLLAPSE_ZOOM;
}

export function getCollapseControlPosition(
  node: Pick<PositionedNode, "x" | "y">,
  zoom: number,
  direction: TreeDirection,
) {
  return {
    left: (node.x + (direction === "right" ? COLLAPSE_CONTROL_NODE_OFFSET : 0)) * zoom,
    top: (node.y + (direction === "down" ? COLLAPSE_CONTROL_NODE_OFFSET : 0)) * zoom,
  };
}
