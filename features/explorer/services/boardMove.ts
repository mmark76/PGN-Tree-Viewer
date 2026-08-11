import { Chess } from "chess.js";
import type { Square } from "chess.js";

export type PromotionPiece = "q" | "r" | "b" | "n";

export type PlayedBoardMove = {
  from: string;
  to: string;
  san: string;
  promotion?: PromotionPiece;
  fen: string;
};

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

function isPromotionPiece(value: unknown): value is PromotionPiece {
  return typeof value === "string" && PROMOTION_PIECES.includes(value as PromotionPiece);
}

function legalPromotionChoices(chess: Chess, from: string, to: string): PromotionPiece[] {
  const legalMoves = chess.moves({ square: from as Square, verbose: true });
  const legalPromotions = new Set(
    legalMoves
      .filter((move) => move.to === to && isPromotionPiece(move.promotion))
      .map((move) => move.promotion as PromotionPiece),
  );

  return PROMOTION_PIECES.filter((piece) => legalPromotions.has(piece));
}

export function promotionChoicesForMove(
  fen: string,
  from: string,
  to: string,
): PromotionPiece[] {
  try {
    return legalPromotionChoices(new Chess(fen), from, to);
  } catch {
    return [];
  }
}

export function playBoardMove(
  fen: string,
  from: string,
  to: string,
  promotion?: PromotionPiece,
): PlayedBoardMove | null {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(from as Square);
    const reachesPromotionRank = piece?.type === "p" && /[18]$/.test(to);
    if (!reachesPromotionRank && promotion !== undefined) return null;

    if (!reachesPromotionRank) {
      const played = chess.move({ from: from as Square, to: to as Square });
      if (!played) return null;
      return {
        from: played.from,
        to: played.to,
        san: played.san,
        fen: chess.fen(),
      };
    }

    const promotionChoices = legalPromotionChoices(chess, from, to);
    if (
      (promotion !== undefined && !promotionChoices.includes(promotion))
      || (promotionChoices.length > 0 && promotion === undefined)
    ) {
      return null;
    }

    const played = chess.move({
      from: from as Square,
      to: to as Square,
      ...(promotionChoices.length > 0 ? { promotion } : {}),
    });
    if (!played) return null;
    return {
      from: played.from,
      to: played.to,
      san: played.san,
      promotion: isPromotionPiece(played.promotion) ? played.promotion : undefined,
      fen: chess.fen(),
    };
  } catch {
    return null;
  }
}
