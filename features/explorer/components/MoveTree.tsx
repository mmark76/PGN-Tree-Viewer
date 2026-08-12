import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { TreeNode } from "../types";
import { fitTreeZoom, layoutTree, smartFitTreeZoom } from "../services/treeLayout";
import { popularityPercentage, resultCount } from "../services/treeBuilder";
import { createAnimationFrameScheduler } from "../services/viewportScheduler";
import {
  getCollapseControlPosition,
  getNavigatorKeyCommand,
  getNavigatorLensPercentage,
  getNavigatorTreePoint,
  getTreeKeyboardAction,
  getVisibleTreeItems,
  shouldShowPointerCollapseControls,
} from "../services/treeNavigation";
import { usePrefersReducedMotion } from "../services/reducedMotion";
import { TREE_PANEL_RESIZE_COMMIT_EVENT } from "../services/treePanelResize";
import { gamesLabel, messages } from "../i18n";
import type { Locale } from "../i18n";
import type { TreeDirection } from "../settings";

type MoveTreeProps = {
  root: TreeNode;
  selectedId: string;
  collapsedIds: Set<string>;
  zoom: number;
  viewMode: "smart" | "overview" | "manual";
  fitRequest: number;
  locale: Locale;
  direction: TreeDirection;
  onZoomChange: (zoom: number) => void;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

export function MoveTree({
  root,
  selectedId,
  collapsedIds,
  zoom,
  viewMode,
  fitRequest,
  locale,
  direction,
  onZoomChange,
  onSelect,
  onToggle,
}: MoveTreeProps) {
  const text = messages[locale];
  const reduceMotion = usePrefersReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const navigatorSvgRef = useRef<SVGSVGElement>(null);
  const navigatorWindowRef = useRef<SVGRectElement>(null);
  const navigatorLensRef = useRef<HTMLSpanElement>(null);
  const navigatorVisibilityRef = useRef(false);
  const navigatorLensFrameRef = useRef<number | null>(null);
  const pendingNavigatorPointRef = useRef<{ x: number; y: number } | null>(null);
  const treeItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const [showNavigator, setShowNavigator] = useState(false);
  const [focusedId, setFocusedId] = useState(selectedId);
  const layout = useMemo(() => layoutTree(root, collapsedIds, direction), [root, collapsedIds, direction]);
  const treeItems = useMemo(
    () => getVisibleTreeItems(root, collapsedIds),
    [root, collapsedIds],
  );
  const visibleItemIds = useMemo(
    () => new Set(treeItems.map(({ node }) => node.id)),
    [treeItems],
  );
  const parentIds = useMemo(() => {
    const parents = new Map<string, string | null>();
    const collect = (node: TreeNode) => {
      parents.set(node.id, node.parentId);
      node.children.forEach(collect);
    };
    collect(root);
    return parents;
  }, [root]);
  const positionedNodes = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node])),
    [layout.nodes],
  );
  const selectedAncestors = useMemo(() => {
    const ids = new Set<string>();
    let current = positionedNodes.get(selectedId);
    while (current) {
      ids.add(current.id);
      current = current.parentId ? positionedNodes.get(current.parentId) : undefined;
    }
    return ids;
  }, [positionedNodes, selectedId]);

  const resolvedFocusedId = useMemo(() => {
    let nextId: string | null | undefined = focusedId;
    while (nextId && !visibleItemIds.has(nextId)) nextId = parentIds.get(nextId);
    if (nextId) return nextId;
    return visibleItemIds.has(selectedId) ? selectedId : root.id;
  }, [focusedId, parentIds, root.id, selectedId, visibleItemIds]);

  const fitTree = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextZoom = viewMode === "smart"
      ? smartFitTreeZoom(layout.width, layout.height, viewport.clientWidth, viewport.clientHeight)
      : fitTreeZoom(layout.width, layout.height, viewport.clientWidth, viewport.clientHeight);
    onZoomChange(nextZoom);
    viewport.scrollTo({ left: 0, top: 0 });
  }, [layout.height, layout.width, onZoomChange, viewMode]);

  useEffect(() => {
    if (viewMode === "manual") return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const treePanel = viewport.closest<HTMLElement>(".tree-section");
    const fitUnlessPanelIsResizing = () => {
      if (treePanel?.dataset.treeResizing === "true") return;
      fitTree();
    };
    const view = viewport.ownerDocument.defaultView;
    if (!view) return;
    const scheduler = createAnimationFrameScheduler(
      fitUnlessPanelIsResizing,
      view.requestAnimationFrame.bind(view),
      view.cancelAnimationFrame.bind(view),
    );
    scheduler.schedule();
    const observer = new ResizeObserver(scheduler.schedule);
    observer.observe(viewport);
    treePanel?.addEventListener(TREE_PANEL_RESIZE_COMMIT_EVENT, scheduler.schedule);
    return () => {
      observer.disconnect();
      treePanel?.removeEventListener(TREE_PANEL_RESIZE_COMMIT_EVENT, scheduler.schedule);
      scheduler.cancel();
    };
  }, [fitRequest, fitTree, viewMode]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateNavigatorWindow = () => {
      const safeZoom = zoom > 0 ? zoom : 1;
      const width = viewport.clientWidth / safeZoom;
      const height = viewport.clientHeight / safeZoom;
      const nextShowNavigator = width > 0 && (
        width < layout.width - 1 || height < layout.height - 1
      );

      if (navigatorVisibilityRef.current !== nextShowNavigator) {
        navigatorVisibilityRef.current = nextShowNavigator;
        setShowNavigator(nextShowNavigator);
      }

      const navigatorWindow = navigatorWindowRef.current;
      if (!navigatorWindow) return;
      navigatorWindow.setAttribute("x", String(Math.max(0, viewport.scrollLeft / safeZoom)));
      navigatorWindow.setAttribute("y", String(Math.max(0, viewport.scrollTop / safeZoom)));
      navigatorWindow.setAttribute("width", String(Math.min(layout.width, width)));
      navigatorWindow.setAttribute("height", String(Math.min(layout.height, height)));
    };
    const view = viewport.ownerDocument.defaultView;
    if (!view) return;
    const scheduler = createAnimationFrameScheduler(
      updateNavigatorWindow,
      view.requestAnimationFrame.bind(view),
      view.cancelAnimationFrame.bind(view),
    );

    scheduler.schedule();
    viewport.addEventListener("scroll", scheduler.schedule, { passive: true });
    const observer = new ResizeObserver(scheduler.schedule);
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", scheduler.schedule);
      observer.disconnect();
      scheduler.cancel();
    };
  }, [layout.height, layout.width, zoom]);

  const scrollToTreePoint = useCallback((
    treeX: number,
    treeY: number,
    behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth",
  ) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      left: treeX * zoom - viewport.clientWidth / 2,
      top: treeY * zoom - viewport.clientHeight / 2,
      behavior,
    });
  }, [reduceMotion, zoom]);

  const moveNavigatorLens = useCallback((treeX: number, treeY: number) => {
    const lens = navigatorLensRef.current;
    if (lens) {
      const xPercent = getNavigatorLensPercentage(treeX, layout.width);
      const yPercent = getNavigatorLensPercentage(treeY, layout.height);
      lens.style.setProperty("--navigator-lens-x", `${xPercent}%`);
      lens.style.setProperty("--navigator-lens-y", `${yPercent}%`);
    }
    pendingNavigatorPointRef.current = { x: treeX, y: treeY };
    if (navigatorLensFrameRef.current !== null) return;
    const view = viewportRef.current?.ownerDocument.defaultView;
    if (!view) return;
    navigatorLensFrameRef.current = view.requestAnimationFrame(() => {
      navigatorLensFrameRef.current = null;
      const point = pendingNavigatorPointRef.current;
      pendingNavigatorPointRef.current = null;
      if (point) scrollToTreePoint(point.x, point.y, "auto");
    });
  }, [layout.height, layout.width, scrollToTreePoint]);
  const navigatorNodeRadius = Math.max(5, Math.min(12, Math.min(layout.width, layout.height) / 70));
  const selectedNode = positionedNodes.get(selectedId);

  useEffect(() => () => {
    const view = viewportRef.current?.ownerDocument.defaultView;
    if (navigatorLensFrameRef.current !== null && view) {
      view.cancelAnimationFrame(navigatorLensFrameRef.current);
    }
    navigatorLensFrameRef.current = null;
    pendingNavigatorPointRef.current = null;
  }, []);

  useEffect(() => {
    if (selectedNode) {
      const lens = navigatorLensRef.current;
      if (!lens) return;
      const xPercent = getNavigatorLensPercentage(selectedNode.x, layout.width);
      const yPercent = getNavigatorLensPercentage(selectedNode.y, layout.height);
      lens.style.setProperty("--navigator-lens-x", `${xPercent}%`);
      lens.style.setProperty("--navigator-lens-y", `${yPercent}%`);
    }
  }, [layout.height, layout.width, selectedNode]);

  const navigateLensFromClient = useCallback((
    clientX: number,
    clientY: number,
  ) => {
    const bounds = navigatorSvgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const point = getNavigatorTreePoint(
      bounds,
      clientX,
      clientY,
      layout.width,
      layout.height,
    );
    if (point) moveNavigatorLens(point.x, point.y);
  }, [layout.height, layout.width, moveNavigatorLens]);

  const navigateFromOverview = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      const selected = positionedNodes.get(selectedId);
      if (selected) moveNavigatorLens(selected.x, selected.y);
      return;
    }
    navigateLensFromClient(event.clientX, event.clientY);
  };

  const moveLensFromPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    navigateLensFromClient(event.clientX, event.clientY);
  };

  const beginLensPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveLensFromPointer(event);
  };

  const endLensPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    moveLensFromPointer(event);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelLensPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleNavigatorKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const command = getNavigatorKeyCommand(event.key);
    if (!command) return;

    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    const horizontalStep = Math.max(48, viewport.clientWidth * 0.3);
    const verticalStep = Math.max(48, viewport.clientHeight * 0.3);

    if (command === "center-selected") {
      if (selectedNode) moveNavigatorLens(selectedNode.x, selectedNode.y);
      return;
    }

    if (command === "start") {
      viewport.scrollTo({ left: 0, top: 0, behavior });
      return;
    }

    if (command === "end") {
      viewport.scrollTo({
        left: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
        top: Math.max(0, viewport.scrollHeight - viewport.clientHeight),
        behavior,
      });
      return;
    }

    viewport.scrollTo({
      left: viewport.scrollLeft
        + (command === "pan-left" ? -horizontalStep : command === "pan-right" ? horizontalStep : 0),
      top: viewport.scrollTop
        + (command === "pan-up" ? -verticalStep : command === "pan-down" ? verticalStep : 0),
      behavior,
    });
  };

  const focusTreeItem = useCallback((id: string) => {
    setFocusedId(id);
    treeItemRefs.current.get(id)?.focus();
  }, []);

  const handleTreeKeyDown = useCallback((
    event: ReactKeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const action = getTreeKeyboardAction(treeItems, id, event.key, collapsedIds);
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();
    if (action.focusId) focusTreeItem(action.focusId);
    if (action.toggleId) {
      setFocusedId(action.toggleId);
      onToggle(action.toggleId);
    }
    if (action.selectId) onSelect(action.selectId);
  }, [collapsedIds, focusTreeItem, onSelect, onToggle, treeItems]);

  const toggleTreeItem = useCallback((id: string) => {
    focusTreeItem(id);
    onToggle(id);
  }, [focusTreeItem, onToggle]);
  const navigatorGraph = useMemo(() => (
    <>
      {layout.edges.map(({ from, to }) => (
        <line key={`${from.id}-${to.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      ))}
      {layout.nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={navigatorNodeRadius}
        />
      ))}
    </>
  ), [layout.edges, layout.nodes, navigatorNodeRadius]);

  return (
    <div className="tree-viewport-shell">
      <div
        id="move-tree-viewport"
        ref={viewportRef}
        className="tree-viewport"
        data-orientation={direction}
      >
        <div
          className="tree-canvas"
          style={{ width: layout.width * zoom, height: layout.height * zoom }}
        >
          <div
            className="tree-lines-layer"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <svg className="tree-lines" width={layout.width} height={layout.height} aria-hidden="true">
              {layout.edges.map(({ from, to }) => {
                const midX = from.x + (to.x - from.x) * 0.52;
                const midY = from.y + (to.y - from.y) * 0.52;
                const active = selectedAncestors.has(from.id) && selectedAncestors.has(to.id);
                return (
                  <path
                    key={`${from.id}-${to.id}`}
                    className={`tree-line${active ? " selected" : ""}`}
                    d={direction === "right"
                      ? `M ${from.x + 29} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 29} ${to.y}`
                      : `M ${from.x} ${from.y + 29} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 29}`}
                  />
                );
              })}
            </svg>
          </div>
          <div
            className="tree-items"
            role="tree"
            aria-label={text.moveTree}
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {treeItems.map(({ node: treeNode, level, posInSet, setSize }) => {
              const node = positionedNodes.get(treeNode.id);
              if (!node) return null;
              const total = resultCount(node.results);
              const parentShare = popularityPercentage(node.results, node.parentCount);
              const countLabel = total ? gamesLabel(locale, total) : "";
              const isCollapsed = collapsedIds.has(node.id);
              return (
                <div
                  key={node.id}
                  className="tree-node-wrap"
                  role="none"
                  style={{ left: node.x, top: node.y }}
                >
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) treeItemRefs.current.set(node.id, element);
                      else treeItemRefs.current.delete(node.id);
                    }}
                    role="treeitem"
                    className={`move-node${node.id === selectedId ? " selected" : ""}${node.id === "start" ? " root" : ""}`}
                    tabIndex={node.id === resolvedFocusedId ? 0 : -1}
                    aria-selected={node.id === selectedId}
                    aria-level={level}
                    aria-posinset={posInSet}
                    aria-setsize={setSize}
                    aria-expanded={node.children.length ? !isCollapsed : undefined}
                    aria-label={`${node.id === "start" ? text.start : node.san}${countLabel ? `, ${countLabel}` : ""}`}
                    onFocus={() => setFocusedId(node.id)}
                    onKeyDown={(event) => handleTreeKeyDown(event, node.id)}
                    onClick={() => {
                      setFocusedId(node.id);
                      onSelect(node.id);
                    }}
                  >
                    {node.id === "start" ? (
                      <strong>{text.start}</strong>
                    ) : (
                      <>
                        <span className="node-san">{node.san}</span>
                        {parentShare !== null && <span className="node-rate">{parentShare}%</span>}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {shouldShowPointerCollapseControls(zoom) && (
            <div className="tree-collapse-overlay" aria-hidden="true">
              {treeItems.map(({ node: treeNode }) => {
                const node = positionedNodes.get(treeNode.id);
                if (!node?.children.length) return null;
                const controlPosition = getCollapseControlPosition(node, zoom, direction);
                return (
                  <span
                    key={node.id}
                    className="collapse-control"
                    aria-hidden="true"
                    style={controlPosition}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleTreeItem(node.id);
                    }}
                  >
                    <span className="collapse-control-glyph">
                      {collapsedIds.has(node.id) ? "+" : "−"}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="tree-navigator" hidden={!showNavigator}>
        <div className="tree-navigator-label">
          <strong>{text.treeNavigator}</strong>
          <span>{text.treeNavigatorHint}</span>
        </div>
        <button
          type="button"
          className="tree-navigator-map"
          aria-label={`${text.treeNavigator}. ${text.treeNavigatorHint}`}
          aria-describedby="tree-navigator-lens-description"
          aria-controls="move-tree-viewport"
          title={text.treeNavigatorLensHint}
          onClick={navigateFromOverview}
          onPointerDown={beginLensPointer}
          onPointerMove={moveLensFromPointer}
          onPointerUp={endLensPointer}
          onPointerCancel={cancelLensPointer}
          onKeyDown={handleNavigatorKeyDown}
        >
          <span id="tree-navigator-lens-description" className="visually-hidden">
            {text.treeNavigatorLensHint}
          </span>
          <span className="tree-navigator-visual" aria-hidden="true">
            <svg
              ref={navigatorSvgRef}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              {navigatorGraph}
              {selectedNode && (
                <circle
                  cx={selectedNode.x}
                  cy={selectedNode.y}
                  r={navigatorNodeRadius}
                  className="selected"
                />
              )}
              <rect
                ref={navigatorWindowRef}
                className="tree-navigator-window"
                x={0}
                y={0}
                width={0}
                height={0}
              />
            </svg>
            <span
              ref={navigatorLensRef}
              className="tree-navigator-lens"
              style={{
                "--navigator-lens-x": `${getNavigatorLensPercentage(selectedNode?.x ?? layout.width / 2, layout.width)}%`,
                "--navigator-lens-y": `${getNavigatorLensPercentage(selectedNode?.y ?? layout.height / 2, layout.height)}%`,
              } as CSSProperties}
            >
              <span className="tree-navigator-lens-ring">
                <span className="tree-navigator-lens-core" />
              </span>
              <span className="tree-navigator-lens-handle" />
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
