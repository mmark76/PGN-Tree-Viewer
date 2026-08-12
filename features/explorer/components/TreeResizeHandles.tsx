import { useCallback, useEffect, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import type { Locale } from "../i18n";
import { messages } from "../i18n";
import {
  calculateTreeResizeBounds,
  clampTreePanelSize,
  resizeTreePanel,
  resizeTreePanelFromKey,
  TREE_PANEL_RESIZE_COMMIT_EVENT,
  type TreePanelSize,
  type TreeResizeAxis,
  type TreeResizeBounds,
} from "../services/treePanelResize";

type TreeResizeHandlesProps = {
  sectionRef: RefObject<HTMLElement | null>;
  size: TreePanelSize;
  locale: Locale;
  onResize: (size: TreePanelSize) => void;
};

type ActiveResize = {
  axis: TreeResizeAxis;
  baseSize: TreePanelSize;
  bounds: TreeResizeBounds;
  lastSize: TreePanelSize;
  pointerId: number;
  startHeight: number;
  startWidth: number;
  startX: number;
  startY: number;
  target: HTMLButtonElement;
};

export function TreeResizeHandles({ sectionRef, size, locale, onResize }: TreeResizeHandlesProps) {
  const text = messages[locale];
  const activeResizeRef = useRef<ActiveResize | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingSizeRef = useRef<TreePanelSize | null>(null);
  const sizeRef = useRef(size);
  const onResizeRef = useRef(onResize);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  const applyPendingSize = useCallback(() => {
    frameRef.current = null;
    const pending = pendingSizeRef.current;
    pendingSizeRef.current = null;
    const section = sectionRef.current;
    if (pending && section) {
      applyPanelSize(section, pending, activeResizeRef.current?.bounds);
    }
  }, [sectionRef]);

  const cancelPendingSize = useCallback(() => {
    const view = sectionRef.current?.ownerDocument.defaultView;
    if (frameRef.current !== null && view) view.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    pendingSizeRef.current = null;
  }, [sectionRef]);

  const schedulePreview = useCallback((nextSize: TreePanelSize) => {
    pendingSizeRef.current = nextSize;
    const view = sectionRef.current?.ownerDocument.defaultView;
    if (!view) {
      applyPendingSize();
      return;
    }
    if (frameRef.current !== null) return;
    frameRef.current = view.requestAnimationFrame(applyPendingSize);
  }, [applyPendingSize, sectionRef]);

  useEffect(() => {
    const section = sectionRef.current;
    const view = section?.ownerDocument.defaultView;
    if (!section || !view) return;

    const reconcileToViewport = () => {
      const active = activeResizeRef.current;
      if (active) {
        activeResizeRef.current = null;
        cancelPendingSize();
        safeReleasePointerCapture(active.target, active.pointerId);
        completeInteractiveResize(section);
      }

      const bounds = readResizeBounds(section);
      section.style.setProperty("--tree-panel-max-height", `${bounds.maxHeight}px`);
      const current = sizeRef.current;
      if (current.width === null && current.height === null) return;

      const rect = section.getBoundingClientRect();
      const clamped = clampTreePanelSize({
        width: current.width ?? rect.width,
        height: current.height ?? rect.height,
      }, bounds);
      const next = {
        width: current.width === null ? null : clamped.width,
        height: current.height === null ? null : clamped.height,
      };
      applyPanelSize(section, next, bounds);
      if (!samePanelSize(current, next)) {
        sizeRef.current = next;
        onResizeRef.current(next);
      }
    };

    reconcileToViewport();
    view.addEventListener("resize", reconcileToViewport);
    view.addEventListener("orientationchange", reconcileToViewport);
    return () => {
      view.removeEventListener("resize", reconcileToViewport);
      view.removeEventListener("orientationchange", reconcileToViewport);
      const active = activeResizeRef.current;
      activeResizeRef.current = null;
      if (active) safeReleasePointerCapture(active.target, active.pointerId);
      section.removeAttribute("data-tree-resizing");
      cancelPendingSize();
    };
  }, [cancelPendingSize, sectionRef]);

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>, axis: TreeResizeAxis) => {
    if (axis !== "height" && isStackedLayout(event.currentTarget.ownerDocument.defaultView)) return;
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const baseSize = sizeRef.current;
    activeResizeRef.current = {
      axis,
      baseSize,
      bounds: readResizeBounds(section),
      lastSize: baseSize,
      pointerId: event.pointerId,
      startHeight: rect.height,
      startWidth: rect.width,
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
    };
    section.setAttribute("data-tree-resizing", "true");
    event.preventDefault();
    safeSetPointerCapture(event.currentTarget, event.pointerId);
  };

  const continueResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = activeResizeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = panelSizeFromPointer(event.clientX, event.clientY, active);
    active.lastSize = next;
    schedulePreview(next);
  };

  const finishResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = activeResizeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = panelSizeFromPointer(event.clientX, event.clientY, active);
    activeResizeRef.current = null;
    cancelPendingSize();
    const section = sectionRef.current;
    if (section) applyPanelSize(section, next, active.bounds);
    safeReleasePointerCapture(event.currentTarget, event.pointerId);
    if (section) completeInteractiveResize(section);
    sizeRef.current = next;
    onResizeRef.current(next);
  };

  const cancelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = activeResizeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activeResizeRef.current = null;
    cancelPendingSize();
    const section = sectionRef.current;
    if (section) applyPanelSize(section, active.baseSize, readResizeBounds(section));
    safeReleasePointerCapture(event.currentTarget, event.pointerId);
    if (section) completeInteractiveResize(section);
  };

  const finishLostCapture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = activeResizeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activeResizeRef.current = null;
    const next = pendingSizeRef.current ?? active.lastSize;
    cancelPendingSize();
    const section = sectionRef.current;
    if (section) applyPanelSize(section, next, active.bounds);
    if (section) completeInteractiveResize(section);
    if (!samePanelSize(active.baseSize, next)) {
      sizeRef.current = next;
      onResizeRef.current(next);
    }
  };

  const resizeFromKeyboard = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    axis: TreeResizeAxis,
  ) => {
    if (axis !== "height" && isStackedLayout(event.currentTarget.ownerDocument.defaultView)) return;
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const current = sizeRef.current;
    const bounds = readResizeBounds(section);
    const nextValue = resizeTreePanelFromKey(
      { width: current.width ?? rect.width, height: current.height ?? rect.height },
      event.key,
      axis,
      bounds,
      event.shiftKey ? 64 : undefined,
    );
    if (!nextValue) return;
    event.preventDefault();
    const next = {
      width: axis === "height" ? current.width : nextValue.width,
      height: axis === "width" ? current.height : nextValue.height,
    };
    applyPanelSize(section, next, bounds);
    sizeRef.current = next;
    onResizeRef.current(next);
  };

  const sharedPointerHandlers = {
    onPointerMove: continueResize,
    onPointerUp: finishResize,
    onPointerCancel: cancelResize,
    onLostPointerCapture: finishLostCapture,
  };

  return (
    <div className="tree-resize-handles" aria-label={text.resizeTreePanel}>
      <button
        type="button"
        className="tree-resize-handle tree-resize-handle-width"
        aria-label={text.resizeTreeWidth}
        title={`${text.resizeTreeWidth}. ${text.resizeTreeKeyboardHint}`}
        onPointerDown={(event) => beginResize(event, "width")}
        onKeyDown={(event) => resizeFromKeyboard(event, "width")}
        {...sharedPointerHandlers}
      />
      <button
        type="button"
        className="tree-resize-handle tree-resize-handle-height"
        aria-label={text.resizeTreeHeight}
        title={`${text.resizeTreeHeight}. ${text.resizeTreeKeyboardHint}`}
        onPointerDown={(event) => beginResize(event, "height")}
        onKeyDown={(event) => resizeFromKeyboard(event, "height")}
        {...sharedPointerHandlers}
      />
      <button
        type="button"
        className="tree-resize-handle tree-resize-handle-corner"
        aria-label={text.resizeTreeBoth}
        title={`${text.resizeTreeBoth}. ${text.resizeTreeKeyboardHint}`}
        onPointerDown={(event) => beginResize(event, "both")}
        onKeyDown={(event) => resizeFromKeyboard(event, "both")}
        {...sharedPointerHandlers}
      />
    </div>
  );
}

function panelSizeFromPointer(clientX: number, clientY: number, active: ActiveResize): TreePanelSize {
  const resized = resizeTreePanel(
    { width: active.startWidth, height: active.startHeight },
    { x: clientX - active.startX, y: clientY - active.startY },
    active.axis,
    active.bounds,
  );
  return {
    width: active.axis === "height" ? active.baseSize.width : resized.width,
    height: active.axis === "width" ? active.baseSize.height : resized.height,
  };
}

function applyPanelSize(
  section: HTMLElement,
  size: TreePanelSize,
  bounds?: TreeResizeBounds,
) {
  const workspace = section.parentElement;
  if (workspace) {
    if (size.width === null) {
      workspace.removeAttribute("data-tree-width-resized");
      workspace.style.removeProperty("--tree-panel-width");
    } else {
      workspace.setAttribute("data-tree-width-resized", "true");
      workspace.style.setProperty("--tree-panel-width", `${size.width}px`);
    }
  }
  if (size.height === null) {
    section.removeAttribute("data-tree-height-resized");
    section.style.removeProperty("--tree-panel-height");
  } else {
    section.setAttribute("data-tree-height-resized", "true");
    section.style.setProperty("--tree-panel-height", `${size.height}px`);
  }
  if (bounds) section.style.setProperty("--tree-panel-max-height", `${bounds.maxHeight}px`);
}

function readResizeBounds(section: HTMLElement): TreeResizeBounds {
  const view = section.ownerDocument.defaultView;
  const sectionRect = section.getBoundingClientRect();
  const workspace = section.parentElement;
  const inspector = workspace?.querySelector<HTMLElement>(".inspector");
  const workspaceWidth = workspace?.getBoundingClientRect().width || sectionRect.width;
  const inspectorWidth = inspector?.getBoundingClientRect().width ?? 0;
  const workspaceStyle = workspace && view ? view.getComputedStyle(workspace) : null;
  const gap = Number.parseFloat(workspaceStyle?.columnGap ?? "") || 0;
  const horizontalPadding = (Number.parseFloat(workspaceStyle?.paddingLeft ?? "") || 0)
    + (Number.parseFloat(workspaceStyle?.paddingRight ?? "") || 0);
  const viewportHeight = view && view.innerHeight > 0
    ? view.innerHeight
    : Math.max(sectionRect.bottom, sectionRect.height);
  return calculateTreeResizeBounds({
    workspaceWidth,
    horizontalPadding,
    inspectorWidth,
    gap,
    viewportHeight,
    sectionTop: sectionRect.top,
    stacked: isStackedLayout(view),
  });
}

function samePanelSize(left: TreePanelSize, right: TreePanelSize) {
  return left.width === right.width && left.height === right.height;
}

function completeInteractiveResize(section: HTMLElement) {
  section.removeAttribute("data-tree-resizing");
  const EventConstructor = section.ownerDocument.defaultView?.Event ?? Event;
  section.dispatchEvent(new EventConstructor(TREE_PANEL_RESIZE_COMMIT_EVENT));
}

function safeSetPointerCapture(target: HTMLButtonElement, pointerId: number) {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {
    // Pointer capture can disappear during orientation changes or DOM teardown.
  }
}

function safeReleasePointerCapture(target: HTMLButtonElement, pointerId: number) {
  try {
    target.releasePointerCapture?.(pointerId);
  } catch {
    // A cancelled pointer may already have released capture.
  }
}

function isStackedLayout(view: Window | null | undefined) {
  return view?.matchMedia?.("(max-width: 1050px)").matches ?? false;
}
