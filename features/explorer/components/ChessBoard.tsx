"use client";

import { Chessboard } from "react-chessboard";
import type { CSSProperties } from "react";
import type { MoveCoordinates } from "../types";

type ChessBoardProps = {
  fen: string;
  lastMove: MoveCoordinates | null;
  flipped: boolean;
  onFlip: () => void;
};

const notationStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 800,
};

export function ChessBoard({ fen, lastMove, flipped, onFlip }: ChessBoardProps) {
  const squareStyles: Record<string, CSSProperties> = {};

  if (lastMove) {
    squareStyles[lastMove.from] = {
      background: "linear-gradient(rgba(210, 232, 95, 0.58), rgba(210, 232, 95, 0.58))",
    };
    squareStyles[lastMove.to] = {
      background: "linear-gradient(rgba(210, 232, 95, 0.72), rgba(210, 232, 95, 0.72))",
      boxShadow: "inset 0 0 0 3px rgba(44, 82, 57, 0.2)",
    };
  }

  return (
    <div className="board-wrap">
      <div className="board-frame" aria-label="Σκακιέρα τρέχουσας θέσης">
        <Chessboard
          options={{
            id: "chesstree-position-board",
            position: fen,
            boardOrientation: flipped ? "black" : "white",
            allowDragging: false,
            allowDrawingArrows: false,
            showNotation: true,
            showAnimations: true,
            animationDurationInMs: 220,
            squareStyles,
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            darkSquareStyle: { backgroundColor: "#6f8f72" },
            lightSquareNotationStyle: { ...notationStyle, color: "#6f8f72" },
            darkSquareNotationStyle: { ...notationStyle, color: "#f0d9b5" },
            boardStyle: {
              borderRadius: "9px",
              overflow: "hidden",
              boxShadow: "none",
            },
          }}
        />
      </div>
      <button className="button board-flip" type="button" onClick={onFlip}>
        <span aria-hidden="true">↻</span>
        Περιστροφή σκακιέρας
      </button>
    </div>
  );
}
