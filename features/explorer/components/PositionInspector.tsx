import type { TreeNode } from "../types";
import { ChessBoard } from "./ChessBoard";
import { dominantOpening, resultCount } from "../services/treeBuilder";
import { gamesLabel, messages } from "../i18n";
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
  sourceNote: string;
};

export function PositionInspector({ node, path, hasData, locale, flipped, onFlip, onBack, onForward, sourceNote }: PositionInspectorProps) {
  const text = messages[locale];
  const total = resultCount(node.results);
  const white = total ? Math.round((node.results.white / total) * 100) : 0;
  const draw = total ? Math.round((node.results.draw / total) * 100) : 0;
  const black = total ? 100 - white - draw : 0;

  return (
    <aside className="inspector" id="position-board">
      <div className="inspector-head">
        <h2>{text.position}</h2>
        <div className="nav-controls">
          <button className="icon-button" type="button" onClick={onBack} disabled={!hasData || !node.parentId} aria-label={text.previousMove}>←</button>
          <button className="icon-button" type="button" onClick={onForward} disabled={!hasData || !node.children.length} aria-label={text.nextMove}>→</button>
        </div>
      </div>
      <ChessBoard fen={node.fen} lastMove={node.move} flipped={flipped} locale={locale} onFlip={onFlip} />
      {hasData ? (
        <>
          <div className="stats-card">
            <div className="stats-title">
              <strong>{node.id === "start" ? text.initialPosition : node.san}</strong>
              <span>{gamesLabel(locale, total)}</span>
            </div>
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
          </div>
          <div className="path-card">
            <p>{dominantOpening(node)}</p>
            <div className="move-path">{formatPath(path) || text.chooseMove}</div>
          </div>
          <div className="source-note"><span className="status-dot" /> {sourceNote}</div>
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

function formatPath(path: string[]) {
  return path.reduce((text, move, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    return `${text}${index % 2 === 0 ? `${moveNumber}. ` : ""}${move}${index % 2 === 1 ? "  " : " "}`;
  }, "").trim();
}
