import type { TreeNode } from "../types";
import { ChessBoard } from "./ChessBoard";
import {
  dominantOpening,
  gameCount,
  knownResultCount,
  resultPercentages,
} from "../services/treeBuilder";
import { gamesLabel, knownResultsLabel, messages } from "../i18n";
import type { Locale } from "../i18n";

type PositionInspectorProps = {
  node: TreeNode;
  path: string[];
  hasData: boolean;
  locale: Locale;
  flipped: boolean;
  onFlip: () => void;
  onBack: () => void;
  onForward: () => void;
  onMove: (from: string, to: string) => boolean;
  lightSquareColor: string;
  darkSquareColor: string;
  sourceNote?: string;
};

export function PositionInspector({ node, path, hasData, locale, flipped, onFlip, onBack, onForward, onMove, lightSquareColor, darkSquareColor, sourceNote }: PositionInspectorProps) {
  const text = messages[locale];
  const games = gameCount(node.results);
  const knownResults = knownResultCount(node.results);
  const { white, draw, black } = resultPercentages(node.results);
  const opening = dominantOpening(node);

  return (
    <aside className="inspector" id="position-board">
      <div className="inspector-head">
        <h2>{text.position}</h2>
        <div className="nav-controls">
          <button className="icon-button" type="button" onClick={onBack} disabled={!hasData || !node.parentId} aria-label={text.previousMove}>←</button>
          <button className="icon-button" type="button" onClick={onForward} disabled={!hasData || !node.children.length} aria-label={text.nextMove}>→</button>
        </div>
      </div>
      <ChessBoard
        fen={node.fen}
        lastMove={node.move}
        flipped={flipped}
        locale={locale}
        lightSquareColor={lightSquareColor}
        darkSquareColor={darkSquareColor}
        onFlip={onFlip}
        onMove={onMove}
      />
      {hasData ? (
        <>
          {games ? (
            <div className="stats-card">
              <div className="stats-title">
                <strong>{node.id === "start" ? text.initialPosition : node.san}</strong>
                <span>
                  {gamesLabel(locale, games)}
                  {node.results.unknown ? ` · ${knownResultsLabel(locale, knownResults)}` : ""}
                </span>
              </div>
              {knownResults ? (
                <>
                  <div className="result-bar" aria-label={`${text.white} ${white}%, ${text.draw} ${draw}%, ${text.black} ${black}%`}>
                    <span style={{ width: `${white}%` }} />
                    <span style={{ width: `${draw}%` }} />
                    <span style={{ width: `${black}%` }} />
                  </div>
                  <div className="result-legend">
                    <div>{text.white}<strong>{white}%</strong></div>
                    <div>{text.draw}<strong>{draw}%</strong></div>
                    <div>{text.black}<strong>{black}%</strong></div>
                  </div>
                </>
              ) : (
                <p>{text.noKnownResults}</p>
              )}
            </div>
          ) : (
            <div className="position-empty manual-position">
              <strong>{text.manualLine}</strong>
              <span>{text.noStatistics}</span>
            </div>
          )}
          <div className="path-card">
            <p>{opening === "__manual__" ? text.manualLine : opening}</p>
            <div className="move-path">{formatPath(path, node.ply - path.length) || text.chooseMove}</div>
          </div>
          {sourceNote && <div className="source-note"><span className="status-dot" /> {sourceNote}</div>}
        </>
      ) : (
        <div className="position-empty">
          <strong>{text.initialPosition}</strong>
          <span>{text.boardFollowsMoves}</span>
        </div>
      )}
    </aside>
  );
}

function formatPath(path: string[], startPly: number) {
  const tokens: string[] = [];
  path.forEach((move, index) => {
    const ply = startPly + index;
    const moveNumber = Math.floor(ply / 2) + 1;
    if (ply % 2 === 0) tokens.push(`${moveNumber}.`);
    else if (index === 0) tokens.push(`${moveNumber}...`);
    tokens.push(move);
  });
  return tokens.join(" ");
}
