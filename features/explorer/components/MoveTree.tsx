import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TreeNode } from "../types";
import { fitTreeZoom, layoutTree } from "../services/treeLayout";
import { popularityPercentage, resultCount } from "../services/treeBuilder";
import { gamesLabel, messages } from "../i18n";
import type { Locale } from "../i18n";
import type { TreeDirection } from "../settings";

type MoveTreeProps = {
  root: TreeNode;
  selectedId: string;
  collapsedIds: Set<string>;
  zoom: number;
  fitToViewport: boolean;
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
  fitToViewport,
  fitRequest,
  locale,
  direction,
  onZoomChange,
  onSelect,
  onToggle,
}: MoveTreeProps) {
  const text = messages[locale];
  const viewportRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutTree(root, collapsedIds, direction), [root, collapsedIds, direction]);
  const selectedAncestors = useMemo(() => {
    const ids = new Set<string>();
    let current = layout.nodes.find((node) => node.id === selectedId);
    while (current) {
      ids.add(current.id);
      current = current.parentId ? layout.nodes.find((node) => node.id === current?.parentId) : undefined;
    }
    return ids;
  }, [layout.nodes, selectedId]);

  const fitTree = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    onZoomChange(fitTreeZoom(layout.width, layout.height, viewport.clientWidth, viewport.clientHeight));
    viewport.scrollTo({ left: 0, top: 0 });
  }, [layout.height, layout.width, onZoomChange]);

  useEffect(() => {
    if (!fitToViewport) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    fitTree();
    const observer = new ResizeObserver(fitTree);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitRequest, fitToViewport, fitTree]);

  return (
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
  );
}
