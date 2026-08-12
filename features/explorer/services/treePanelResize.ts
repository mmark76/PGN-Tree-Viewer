export type TreePanelSize = {
  width: number | null;
  height: number | null;
};

export const DEFAULT_TREE_PANEL_SIZE: TreePanelSize = {
  width: null,
  height: 590,
};

export type TreeResizeAxis = "width" | "height" | "both";

export type TreeResizeBounds = {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
};

export type TreeResizeMetrics = {
  workspaceWidth: number;
  horizontalPadding: number;
  inspectorWidth: number;
  gap: number;
  viewportHeight: number;
  sectionTop: number;
  stacked: boolean;
};

export const MIN_TREE_PANEL_WIDTH = 360;
export const MIN_TREE_PANEL_HEIGHT = 360;
export const TREE_RESIZE_KEYBOARD_STEP = 24;
export const TREE_PANEL_VIEWPORT_GUTTER = 16;
export const TREE_PANEL_RESIZE_COMMIT_EVENT = "tree-panel-resize-commit";

export function calculateTreeResizeBounds(metrics: TreeResizeMetrics): TreeResizeBounds {
  const contentWidth = Math.max(1, metrics.workspaceWidth - metrics.horizontalPadding);
  const inspectorAndGap = metrics.stacked ? 0 : metrics.inspectorWidth + metrics.gap;
  const maxWidth = Math.max(1, contentWidth - inspectorAndGap);
  const sectionTop = Number.isFinite(metrics.sectionTop) ? Math.max(0, metrics.sectionTop) : 0;
  const maxHeight = Math.max(
    1,
    metrics.viewportHeight - sectionTop - TREE_PANEL_VIEWPORT_GUTTER,
  );
  return {
    minWidth: Math.min(MIN_TREE_PANEL_WIDTH, maxWidth),
    maxWidth,
    minHeight: Math.min(MIN_TREE_PANEL_HEIGHT, maxHeight),
    maxHeight,
  };
}

export function clampTreePanelSize(
  requested: { width: number; height: number },
  bounds: TreeResizeBounds,
): { width: number; height: number } {
  return {
    width: clamp(requested.width, bounds.minWidth, bounds.maxWidth),
    height: clamp(requested.height, bounds.minHeight, bounds.maxHeight),
  };
}

export function resizeTreePanel(
  initial: { width: number; height: number },
  delta: { x: number; y: number },
  axis: TreeResizeAxis,
  bounds: TreeResizeBounds,
) {
  return clampTreePanelSize({
    width: initial.width + (axis === "height" ? 0 : delta.x),
    height: initial.height + (axis === "width" ? 0 : delta.y),
  }, bounds);
}

export function resizeTreePanelFromKey(
  current: { width: number; height: number },
  key: string,
  axis: TreeResizeAxis,
  bounds: TreeResizeBounds,
  step = TREE_RESIZE_KEYBOARD_STEP,
) {
  if (key === "Home") {
    return clampTreePanelSize({
      width: axis === "height" ? current.width : bounds.minWidth,
      height: axis === "width" ? current.height : bounds.minHeight,
    }, bounds);
  }
  if (key === "End") {
    return clampTreePanelSize({
      width: axis === "height" ? current.width : bounds.maxWidth,
      height: axis === "width" ? current.height : bounds.maxHeight,
    }, bounds);
  }

  const x = axis !== "height"
    ? key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0
    : 0;
  const y = axis !== "width"
    ? key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0
    : 0;
  if (!x && !y) return null;
  return resizeTreePanel(current, { x, y }, axis, bounds);
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
