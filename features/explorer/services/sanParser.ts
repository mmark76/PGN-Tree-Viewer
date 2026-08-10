import { Chess } from "chess.js";

export type SanValidationResult =
  | { valid: true; moves: string[]; lines: string[][]; finalFen: string }
  | { valid: false; moves: string[]; invalidToken: string; tokenNumber: number };

type SanToken = {
  value: string;
  moveNumber: number;
};

type ParsedSequence = {
  mainLine: string[];
  lines: string[][];
  nextIndex: number;
};

class SanParseError extends Error {
  constructor(
    readonly moves: string[],
    readonly invalidToken: string,
    readonly tokenNumber: number,
  ) {
    super("Invalid SAN input");
  }
}

export function validateSanSequence(text: string, startFen?: string): SanValidationResult {
  const tokens = tokenizeSan(text);
  if (!tokens.length) {
    return { valid: false, moves: [], invalidToken: "", tokenNumber: 1 };
  }

  try {
    const parsed = parseSequence(tokens, 0, [], startFen, false);
    const lines = uniqueLines(parsed.lines);
    const chess = replayLine(parsed.mainLine, startFen);
    return { valid: true, moves: parsed.mainLine, lines, finalFen: chess.fen() };
  } catch (error) {
    if (error instanceof SanParseError) {
      return {
        valid: false,
        moves: error.moves,
        invalidToken: error.invalidToken,
        tokenNumber: error.tokenNumber,
      };
    }
    return { valid: false, moves: [], invalidToken: "", tokenNumber: 1 };
  }
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

  let moveNumber = 0;
  return withoutComments
    .replace(/([()])/g, " $1 ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/^\d+\.(?:\.\.)?/, ""))
    .filter((token) => token && !/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token))
    .map((value): SanToken => ({
      value,
      moveNumber: value === "(" || value === ")" ? moveNumber : ++moveNumber,
    }));
}

function parseSequence(
  tokens: SanToken[],
  startIndex: number,
  prefix: string[],
  startFen: string | undefined,
  expectClose: boolean,
): ParsedSequence {
  const moves = [...prefix];
  const variationLines: string[][] = [];
  const chess = replayLine(moves, startFen);
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.value === "(") {
      if (!moves.length) throw new SanParseError(moves, token.value, token.moveNumber + 1);
      const variation = parseSequence(tokens, index + 1, moves.slice(0, -1), startFen, true);
      variationLines.push(...variation.lines);
      index = variation.nextIndex;
      continue;
    }
    if (token.value === ")") {
      if (!expectClose) throw new SanParseError(moves, token.value, token.moveNumber + 1);
      if (moves.length === prefix.length) {
        throw new SanParseError(moves, token.value, token.moveNumber + 1);
      }
      return { mainLine: moves, lines: [moves, ...variationLines], nextIndex: index + 1 };
    }

    try {
      const played = chess.move(token.value);
      if (!played) throw new Error("Illegal SAN move");
      moves.push(played.san);
    } catch {
      throw new SanParseError(moves, token.value, token.moveNumber);
    }
    index += 1;
  }

  if (expectClose) throw new SanParseError(moves, "(", tokens.at(-1)?.moveNumber ?? 1);
  return { mainLine: moves, lines: [moves, ...variationLines], nextIndex: index };
}

function replayLine(moves: string[], startFen?: string) {
  const chess = startFen ? new Chess(startFen) : new Chess();
  for (const move of moves) chess.move(move);
  return chess;
}

function uniqueLines(lines: string[][]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
