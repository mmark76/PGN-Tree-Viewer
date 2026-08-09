"use client";

import { Chessboard } from "react-chessboard";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { MoveCoordinates } from "../types";
import { messages } from "../i18n";
import type { Locale } from "../i18n";

type ChessBoardProps = {
  fen: string;
  lastMove: MoveCoordinates | null;
  flipped: boolean;
  locale: Locale;
  lightSquareColor: string;
  darkSquareColor: string;
  onFlip: () => void;
  onMove: (from: string, to: string) => boolean;
};

const notationStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 800,
};

export function ChessBoard({ fen, lastMove, flipped, locale, lightSquareColor, darkSquareColor, onFlip, onMove }: ChessBoardProps) {
  const text = messages[locale];
  const [selection, setSelection] = useState<{ fen: string; square: string } | null>(null);
  const selectedSquare = selection?.fen === fen ? selection.square : null;
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

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...squareStyles[selectedSquare],
      boxShadow: "inset 0 0 0 4px rgba(23, 63, 50, 0.52)",
    };
  }

  const tryMove = (from: string, to: string) => {
    const moved = onMove(from, to);
    if (moved) setSelection(null);
    return moved;
  };

  return (
    <div className="board-wrap">
      <div className="board-frame" aria-label={text.currentBoard}>
        <Chessboard
          options={{
            id: "chesstree-position-board",
            position: fen,
            boardOrientation: flipped ? "black" : "white",
            allowDragging: true,
            allowDrawingArrows: false,
            showNotation: true,
            showAnimations: true,
            animationDurationInMs: 220,
            squareStyles,
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              targetSquare ? tryMove(sourceSquare, targetSquare) : false,
            onSquareClick: ({ piece, square }) => {
              if (selectedSquare) {
                if (square === selectedSquare) {
                  setSelection(null);
                  return;
                }
                if (tryMove(selectedSquare, square)) return;
              }
              setSelection(piece ? { fen, square } : null);
            },
            lightSquareStyle: { backgroundColor: lightSquareColor },
            darkSquareStyle: { backgroundColor: darkSquareColor },
            lightSquareNotationStyle: { ...notationStyle, color: darkSquareColor },
            darkSquareNotationStyle: { ...notationStyle, color: lightSquareColor },
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
