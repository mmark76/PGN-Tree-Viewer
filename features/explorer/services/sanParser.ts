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
  const withoutHeaders = text.replace(
    /^\s*\[[A-Za-z0-9_]+\s+"(?:\\.|[^"\\])*"\]\s*$/gm,
    " ",
  );
  const withoutComments = withoutHeaders
    .replace(/\{[^}]*\}/g, " ")
    .replace(/;[^\r\n]*/g, " ")
    .replace(/\$\d+/g, " ");

  return stripVariations(withoutComments)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/^\d+\.(?:\.\.)?/, ""))
    .filter((token) => token && !/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token));
}

function stripVariations(text: string) {
  let depth = 0;
  let mainLine = "";

  for (const character of text) {
    if (character === "(") {
      depth += 1;
      continue;
    }
    if (character === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) mainLine += character;
  }

  return mainLine;
}
