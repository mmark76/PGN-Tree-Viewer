import type { TreeNode } from "../types";
import { ChessBoard } from "./ChessBoard";
import { dominantOpening, resultCount } from "../services/treeBuilder";

type PositionInspectorProps = {
  node: TreeNode;
  path: string[];
  flipped: boolean;
  onFlip: () => void;
  onBack: () => void;
  onForward: () => void;
  sourceNote: string;
};

export function PositionInspector({ node, path, flipped, onFlip, onBack, onForward, sourceNote }: PositionInspectorProps) {
  const total = resultCount(node.results) || 1;
  const white = Math.round((node.results.white / total) * 100);
  const draw = Math.round((node.results.draw / total) * 100);
  const black = 100 - white - draw;

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <h2>Θέση</h2>
        <div className="nav-controls">
          <button className="icon-button" type="button" onClick={onBack} disabled={!node.parentId} aria-label="Προηγούμενη κίνηση">←</button>
          <button className="icon-button" type="button" onClick={onForward} disabled={!node.children.length} aria-label="Επόμενη κύρια κίνηση">→</button>
        </div>
      </div>
      <ChessBoard fen={node.fen} lastMove={node.move} flipped={flipped} onFlip={onFlip} />
      <div className="stats-card">
        <div className="stats-title">
          <strong>{node.san}</strong>
          <span>{resultCount(node.results)} παρτίδες</span>
        </div>
        <div className="result-bar" aria-label={`Λευκά ${white}%, ισοπαλία ${draw}%, μαύρα ${black}%`}>
          <span style={{ width: `${white}%` }} />
          <span style={{ width: `${draw}%` }} />
          <span style={{ width: `${black}%` }} />
        </div>
        <div className="result-legend">
          <div>ΛΕΥΚΑ<strong>{white}%</strong></div>
          <div>ΙΣΟΠΑΛΙΑ<strong>{draw}%</strong></div>
          <div>ΜΑΥΡΑ<strong>{black}%</strong></div>
        </div>
      </div>
      <div className="path-card">
        <p>{dominantOpening(node)}</p>
        <div className="move-path">{formatPath(path) || "Επίλεξε μία κίνηση στο δέντρο."}</div>
      </div>
      <div className="source-note"><span className="status-dot" /> {sourceNote}</div>
    </aside>
  );
}

function formatPath(path: string[]) {
  return path.reduce((text, move, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    return `${text}${index % 2 === 0 ? `${moveNumber}. ` : ""}${move}${index % 2 === 1 ? "  " : " "}`;
  }, "").trim();
}
