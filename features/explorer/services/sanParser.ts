import { Chess } from "chess.js";

export type SanValidationResult =
  | { valid: true; moves: string[]; finalFen: string }
  | { valid: false; moves: string[]; invalidToken: string; tokenNumber: number };

export function validateSanSequence(text: string, startFen?: string): SanValidationResult {
  const tokens = tokenizeSan(text);
  const chess = startFen ? new Chess(startFen) : new Chess();
  const moves: string[] = [];

  if (!tokens.length) {
    return { valid: false, moves, invalidToken: "", tokenNumber: 1 };
  }

  for (const [index, token] of tokens.entries()) {
    try {
      const played = chess.move(token);
      if (!played) throw new Error("Illegal SAN move");
      moves.push(played.san);
    } catch {
      return { valid: false, moves, invalidToken: token, tokenNumber: index + 1 };
    }
  }

  return { valid: true, moves, finalFen: chess.fen() };
}

function tokenizeSan(text: string) {
  return text
    .replace(/\{[^}]*\}/g, " ")
    .replace(/;[^\r\n]*/g, " ")
    .replace(/\$\d+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/^\d+\.(?:\.\.)?/, ""))
    .filter((token) => token && !/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token));
}
