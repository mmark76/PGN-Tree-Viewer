import { useMemo } from "react";
import type { TreeNode } from "../types";
import { layoutTree } from "../services/treeLayout";
import { popularityPercentage, resultCount } from "../services/treeBuilder";
import { gamesLabel, messages } from "../i18n";
import type { Locale } from "../i18n";
import type { TreeDirection } from "../settings";

type MoveTreeProps = {
  root: TreeNode;
  selectedId: string;
  collapsedIds: Set<string>;
  zoom: number;
  locale: Locale;
  direction: TreeDirection;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

export function MoveTree({ root, selectedId, collapsedIds, zoom, locale, direction, onSelect, onToggle }: MoveTreeProps) {
  const text = messages[locale];
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

  return (
    <div className="tree-viewport" data-orientation={direction}>
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
                    ? `M ${from.x + 71} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 71} ${to.y}`
                    : `M ${from.x} ${from.y + 33} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 33}`}
                />
              );
            })}
          </svg>
          {layout.nodes.map((node) => {
            const total = resultCount(node.results);
            const parentShare = popularityPercentage(node.results, node.parentCount);
            const white = total ? (node.results.white / total) * 100 : 0;
            const draw = total ? (node.results.draw / total) * 100 : 0;
            const black = total ? Math.max(0, 100 - white - draw) : 0;
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
                    <><strong>{text.start}</strong>{countLabel && <small>{countLabel}</small>}</>
                  ) : (
                    <>
                      <span className="node-top">
                        <span className="node-san">{node.san}</span>
                        {parentShare !== null && <span className="node-rate">{parentShare}%</span>}
                      </span>
                      {countLabel && (
                        <span className="node-bottom">
                          <span>{countLabel}</span>
                          <span className="node-results" aria-hidden="true">
                            <span style={{ width: `${white}%` }} />
                            <span style={{ width: `${draw}%` }} />
                            <span style={{ width: `${black}%` }} />
                          </span>
                        </span>
                      )}
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
