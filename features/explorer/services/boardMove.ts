import { Chess } from "chess.js";
import type { Square } from "chess.js";

export type PlayedBoardMove = {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  fen: string;
};

export function playBoardMove(fen: string, from: string, to: string): PlayedBoardMove | null {
  const chess = new Chess(fen);
  const piece = chess.get(from as Square);
  if (!piece) return null;

  try {
    const promotion = piece.type === "p" && /[18]$/.test(to) ? "q" : undefined;
    const played = chess.move({ from: from as Square, to: to as Square, promotion });
    if (!played) return null;
    return {
      from: played.from,
      to: played.to,
      san: played.san,
      promotion: played.promotion,
      fen: chess.fen(),
    };
  } catch {
    return null;
  }
}
