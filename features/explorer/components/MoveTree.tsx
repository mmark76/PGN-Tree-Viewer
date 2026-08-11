import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { TreeNode } from "../types";
import { fitTreeZoom, layoutTree, smartFitTreeZoom } from "../services/treeLayout";
import { popularityPercentage, resultCount } from "../services/treeBuilder";
import { createAnimationFrameScheduler } from "../services/viewportScheduler";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const navigatorWindowRef = useRef<SVGRectElement>(null);
  const navigatorVisibilityRef = useRef(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const layout = useMemo(() => layoutTree(root, collapsedIds, direction), [root, collapsedIds, direction]);
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

    fitTree();
    const observer = new ResizeObserver(fitTree);
    observer.observe(viewport);
    return () => observer.disconnect();
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

  const navigateFromOverview = (event: ReactMouseEvent<SVGSVGElement>) => {
    const viewport = viewportRef.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!viewport || !bounds.width || !bounds.height) return;

    const treeX = ((event.clientX - bounds.left) / bounds.width) * layout.width;
    const treeY = ((event.clientY - bounds.top) / bounds.height) * layout.height;
    viewport.scrollTo({
      left: treeX * zoom - viewport.clientWidth / 2,
      top: treeY * zoom - viewport.clientHeight / 2,
      behavior: "smooth",
    });
  };

  const navigatorNodeRadius = Math.max(5, Math.min(12, Math.min(layout.width, layout.height) / 70));
  const selectedNode = positionedNodes.get(selectedId);
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
      <div ref={viewportRef} className="tree-viewport" data-orientation={direction}>
        <div
          className="tree-canvas"
          style={{ width: layout.width * zoom, height: layout.height * zoom }}
        >
          <div style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})`, transformOrigin: "top left", position: "relative" }}>
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
            {layout.nodes.map((node) => {
              const total = resultCount(node.results);
              const parentShare = popularityPercentage(node.results, node.parentCount);
              const countLabel = total ? gamesLabel(locale, total) : "";
              return (
                <div key={node.id} className="tree-node-wrap" style={{ left: node.x, top: node.y }}>
                  <button
                    type="button"
                    className={`move-node${node.id === selectedId ? " selected" : ""}${node.id === "start" ? " root" : ""}`}
                    onClick={() => onSelect(node.id)}
                    aria-label={`${node.id === "start" ? text.start : node.san}${countLabel ? `, ${countLabel}` : ""}`}
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
                  {node.children.length > 0 && (
                    <button
                      type="button"
                      className="collapse-control"
                      aria-label={collapsedIds.has(node.id) ? text.openBranch : text.closeBranch}
                      onClick={() => onToggle(node.id)}
                    >
                      {collapsedIds.has(node.id) ? "+" : "−"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="tree-navigator" role="group" aria-label={text.treeNavigator} hidden={!showNavigator}>
        <div className="tree-navigator-label">
          <strong>{text.treeNavigator}</strong>
          <span>{text.treeNavigatorHint}</span>
        </div>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={text.treeNavigator}
          onClick={navigateFromOverview}
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
          {selectedNode && (
            <circle
              className="tree-navigator-selection"
              cx={selectedNode.x}
              cy={selectedNode.y}
              r={navigatorNodeRadius * 2}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
