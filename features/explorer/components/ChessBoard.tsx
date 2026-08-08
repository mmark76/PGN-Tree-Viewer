"use client";

import { Chessboard } from "react-chessboard";
import type { CSSProperties } from "react";
import type { MoveCoordinates } from "../types";
import { messages } from "../i18n";
import type { Locale } from "../i18n";

type ChessBoardProps = {
  fen: string;
  lastMove: MoveCoordinates | null;
  flipped: boolean;
  locale: Locale;
  onFlip: () => void;
};

const notationStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 800,
};

export function ChessBoard({ fen, lastMove, flipped, locale, onFlip }: ChessBoardProps) {
  const text = messages[locale];
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
      <div className="board-frame" aria-label={text.currentBoard}>
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
        {text.flipBoard}
      </button>
    </div>
  );
}
