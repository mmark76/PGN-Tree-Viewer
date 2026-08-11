import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  checkedAddNonNegativeIntegers,
  LineIntegrityError,
  startPlyFromFen,
} from "./lineIntegrity";

export type SanValidationErrorCode =
  | "invalid-san"
  | "invalid-fen"
  | "start-position-mismatch"
  | "unsafe-integer";

export type SanValidationResult =
  | { valid: true; moves: string[]; lines: string[][]; finalFen: string; startFen: string }
  | {
      valid: false;
      moves: string[];
      invalidToken: string;
      tokenNumber: number;
      errorCode: SanValidationErrorCode;
    };

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
  const resolvedPosition = resolveStartPosition(text, startFen);
  if (!resolvedPosition.valid) {
    return {
      valid: false,
      moves: [],
      invalidToken: "",
      tokenNumber: 1,
      errorCode: resolvedPosition.errorCode,
    };
  }

  const tokens = tokenizeSan(text);
  if (!tokens.length) {
    return {
      valid: false,
      moves: [],
      invalidToken: "",
      tokenNumber: 1,
      errorCode: "invalid-san",
    };
  }

  try {
    const parsed = parseSequence(tokens, 0, [], resolvedPosition.startFen, false);
    const lines = uniqueLines(parsed.lines);
    const startPly = startPlyFromFen(resolvedPosition.startFen);
    for (const line of lines) checkedAddNonNegativeIntegers(startPly, line.length);
    const chess = replayLine(parsed.mainLine, resolvedPosition.startFen);
    return {
      valid: true,
      moves: parsed.mainLine,
      lines,
      finalFen: chess.fen(),
      startFen: resolvedPosition.startFen,
    };
  } catch (error) {
    if (error instanceof LineIntegrityError && error.code === "unsafe-integer") {
      return {
        valid: false,
        moves: [],
        invalidToken: "",
        tokenNumber: 1,
        errorCode: "unsafe-integer",
      };
    }
    if (error instanceof SanParseError) {
      return {
        valid: false,
        moves: error.moves,
        invalidToken: error.invalidToken,
        tokenNumber: error.tokenNumber,
        errorCode: "invalid-san",
      };
    }
    return {
      valid: false,
      moves: [],
      invalidToken: "",
      tokenNumber: 1,
      errorCode: "invalid-san",
    };
  }
}

type ResolvedStartPosition =
  | { valid: true; startFen: string }
  | { valid: false; errorCode: "invalid-fen" | "start-position-mismatch" };

function resolveStartPosition(text: string, requestedStartFen?: string): ResolvedStartPosition {
  const headerFenValues = extractHeaderValues(text, "fen");
  const setupValues = extractHeaderValues(text, "setup");
  if (/^\s*\[\s*FEN\b/im.test(text) && !headerFenValues.length) {
    return { valid: false, errorCode: "invalid-fen" };
  }
  if (setupValues.some((value) => value === "1") && !headerFenValues.length) {
    return { valid: false, errorCode: "invalid-fen" };
  }

  let requested: string | undefined;
  let fromHeader: string | undefined;
  try {
    requested = requestedStartFen ? new Chess(requestedStartFen).fen() : undefined;
    const normalizedHeaders = headerFenValues.map((fen) => new Chess(fen).fen());
    if (new Set(normalizedHeaders).size > 1) return { valid: false, errorCode: "invalid-fen" };
    fromHeader = normalizedHeaders[0];
  } catch {
    return { valid: false, errorCode: "invalid-fen" };
  }

  if (requested && fromHeader && requested !== fromHeader) {
    return { valid: false, errorCode: "start-position-mismatch" };
  }

  return { valid: true, startFen: fromHeader ?? requested ?? DEFAULT_POSITION };
}

function extractHeaderValues(text: string, headerName: string) {
  const values: string[] = [];
  const headerPattern = /^\s*\[\s*([A-Za-z0-9_]+)\s+"((?:\\.|[^"\\])*)"\s*\]\s*$/gm;
  for (const match of text.matchAll(headerPattern)) {
    if (match[1].toLowerCase() !== headerName) continue;
    values.push(match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }
  return values;
}

function tokenizeSan(text: string) {
  const withoutHeaders = text.replace(
    /^\s*\[\s*[A-Za-z0-9_]+\s+"(?:\\.|[^"\\])*"\s*\]\s*$/gm,
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
