import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  checkedAddNonNegativeIntegers,
  LineIntegrityError,
  startPlyFromFen,
} from "./lineIntegrity";
import {
  assertWithinInputLimit,
  InputLimitError,
  type InputLimitErrorCode,
  type InputLimitOverrides,
  type InputLimits,
  resolveInputLimits,
} from "./inputLimits";

export type SanValidationErrorCode =
  | "invalid-san"
  | "invalid-fen"
  | "start-position-mismatch"
  | "unsafe-integer"
  | "input-limit";

export type SanValidationResult =
  | { valid: true; moves: string[]; lines: string[][]; finalFen: string; startFen: string }
  | {
      valid: false;
      moves: string[];
      invalidToken: string;
      tokenNumber: number;
      errorCode: SanValidationErrorCode;
      inputLimit?: {
        code: InputLimitErrorCode;
        limit: number;
        actual: number;
      };
    };

export type SanValidationContexts = {
  fromStart: SanValidationResult;
  fromSelected: SanValidationResult;
};

type SanToken = {
  value: string;
  moveNumber: number;
};

type ParsedSequence = {
  mainLine: string[];
  lines: string[][];
  finalFen: string;
  nextIndex: number;
};

type SanOutputBudget = {
  lines: number;
  plies: number;
};

type LeadingHeader = {
  name: string;
  value: string;
};

type LeadingHeaderSection = {
  bodyStart: number;
  headers: LeadingHeader[];
  malformedFenTag: boolean;
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

export function validateSanSequence(
  text: string,
  startFen?: string,
  limitOverrides: InputLimitOverrides = {},
): SanValidationResult {
  try {
    return validateSanSequenceWithinLimits(text, startFen, limitOverrides);
  } catch (error) {
    if (error instanceof InputLimitError) {
      return {
        valid: false,
        moves: [],
        invalidToken: "",
        tokenNumber: 1,
        errorCode: "input-limit",
        inputLimit: { code: error.code, limit: error.limit, actual: error.actual },
      };
    }
    throw error;
  }
}

/**
 * Validates the two Paste SAN destinations while sharing the result whenever
 * both destinations resolve to the same starting position. A declared FEN
 * mismatch is also reported without replaying the moves a second time.
 */
export function validateSanContexts(
  text: string,
  selectedFen: string,
  limitOverrides: InputLimitOverrides = {},
): SanValidationContexts {
  const fromStart = validateSanSequence(text, undefined, limitOverrides);

  if (!fromStart.valid && fromStart.errorCode === "input-limit") {
    return { fromStart, fromSelected: fromStart };
  }

  const resolvedFromStart = resolveStartPosition(text);
  if (!resolvedFromStart.valid) {
    return { fromStart, fromSelected: fromStart };
  }

  let normalizedSelectedFen: string;
  try {
    normalizedSelectedFen = new Chess(selectedFen).fen();
  } catch {
    const fromSelected = invalidValidationResult("invalid-fen");
    return { fromStart, fromSelected };
  }

  if (resolvedFromStart.startFen === normalizedSelectedFen) {
    return { fromStart, fromSelected: fromStart };
  }

  if (extractHeaderValues(text, "fen").length > 0) {
    return {
      fromStart,
      fromSelected: invalidValidationResult("start-position-mismatch"),
    };
  }

  return {
    fromStart,
    fromSelected: validateSanSequence(text, normalizedSelectedFen, limitOverrides),
  };
}

function validateSanSequenceWithinLimits(
  text: string,
  startFen: string | undefined,
  limitOverrides: InputLimitOverrides,
): SanValidationResult {
  const limits = resolveInputLimits(limitOverrides);
  assertWithinInputLimit("san-length", text.length, limits.maxSanCharacters);
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

  const tokens = tokenizeSan(text, limits);
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
    const parsed = parseSequence(
      tokens,
      0,
      [],
      resolvedPosition.startFen,
      false,
      0,
      { lines: 0, plies: 0 },
      limits,
    );
    const lines = uniqueLines(parsed.lines);
    assertSanNodeBudget(lines, limits);
    const startPly = startPlyFromFen(resolvedPosition.startFen);
    for (const line of lines) checkedAddNonNegativeIntegers(startPly, line.length);
    return {
      valid: true,
      moves: parsed.mainLine,
      lines,
      finalFen: parsed.finalFen,
      startFen: resolvedPosition.startFen,
    };
  } catch (error) {
    if (error instanceof InputLimitError) throw error;
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
  const headerSection = scanLeadingHeaderSection(text);
  const headerFenValues = headerValues(headerSection, "fen");
  const setupValues = headerValues(headerSection, "setup");
  if (headerSection.malformedFenTag && !headerFenValues.length) {
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
  return headerValues(scanLeadingHeaderSection(text), headerName);
}

function headerValues(section: LeadingHeaderSection, headerName: string) {
  const normalizedName = headerName.toLowerCase();
  return section.headers
    .filter(({ name }) => name.toLowerCase() === normalizedName)
    .map(({ value }) => value);
}

function scanLeadingHeaderSection(text: string): LeadingHeaderSection {
  const headers: LeadingHeader[] = [];
  const headerPattern = /^\s*\[\s*([A-Za-z0-9_]+)\s+"((?:\\.|[^"\\])*)"\s*\]\s*$/;
  let offset = 0;

  while (offset < text.length) {
    const lineEnd = nextLineEnd(text, offset);
    let firstContent = offset;
    while (firstContent < lineEnd.contentEnd && /\s/.test(text[firstContent])) {
      firstContent += 1;
    }

    if (firstContent === lineEnd.contentEnd) {
      offset = lineEnd.nextOffset;
      continue;
    }

    if (text[firstContent] !== "[") {
      return { bodyStart: offset, headers, malformedFenTag: false };
    }

    const line = text.slice(offset, lineEnd.contentEnd);
    const match = headerPattern.exec(line);
    if (!match) {
      return {
        bodyStart: offset,
        headers,
        malformedFenTag: /^\s*\[\s*FEN\b/i.test(line),
      };
    }

    headers.push({
      name: match[1],
      value: match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    });
    offset = lineEnd.nextOffset;
  }

  return { bodyStart: text.length, headers, malformedFenTag: false };
}

function nextLineEnd(text: string, offset: number) {
  let contentEnd = offset;
  while (contentEnd < text.length && text[contentEnd] !== "\r" && text[contentEnd] !== "\n") {
    contentEnd += 1;
  }

  let nextOffset = contentEnd;
  if (text[nextOffset] === "\r") nextOffset += 1;
  if (text[nextOffset] === "\n") nextOffset += 1;
  return { contentEnd, nextOffset };
}

function tokenizeSan(text: string, limits: InputLimits) {
  const { bodyStart } = scanLeadingHeaderSection(text);
  let moveNumber = 0;
  const tokens: SanToken[] = [];
  let rawToken = "";
  let inSemicolonComment = false;
  let noClosingBraceRemains = false;

  const emitToken = (rawValue: string) => {
    const value = rawValue.replace(/^\d+\.(?:\.\.)?/, "");
    if (
      !value
      || /^\.+$/.test(value)
      || /^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(value)
    ) {
      return;
    }

    const nextCount = tokens.length + 1;
    assertWithinInputLimit("san-token-count", nextCount, limits.maxSanTokens);
    if (value !== "(" && value !== ")") moveNumber += 1;
    tokens.push({ value, moveNumber });
  };

  const flushToken = () => {
    if (!rawToken) return;
    const value = rawToken;
    rawToken = "";
    emitToken(value);
  };

  for (let index = bodyStart; index < text.length; index += 1) {
    const character = text[index];

    if (inSemicolonComment) {
      if (character === "\r" || character === "\n") inSemicolonComment = false;
      continue;
    }

    if (character === "{" && !noClosingBraceRemains) {
      const commentEnd = text.indexOf("}", index + 1);
      if (commentEnd >= 0) {
        flushToken();
        index = commentEnd;
        continue;
      }
      noClosingBraceRemains = true;
    }

    if (character === ";") {
      flushToken();
      inSemicolonComment = true;
      continue;
    }

    if (character === "$" && isDecimalDigit(text[index + 1])) {
      flushToken();
      let digitEnd = index + 2;
      while (digitEnd < text.length && isDecimalDigit(text[digitEnd])) digitEnd += 1;
      index = digitEnd - 1;
      continue;
    }

    if (character === "(" || character === ")") {
      flushToken();
      emitToken(character);
      continue;
    }

    if (/\s/.test(character)) {
      flushToken();
      continue;
    }

    rawToken += character;
  }

  flushToken();
  return tokens;
}

function isDecimalDigit(value: string | undefined) {
  return value !== undefined && value >= "0" && value <= "9";
}

function parseSequence(
  tokens: SanToken[],
  startIndex: number,
  prefix: string[],
  positionFen: string,
  expectClose: boolean,
  nestingDepth: number,
  outputBudget: SanOutputBudget,
  limits: InputLimits,
): ParsedSequence {
  const moves = [...prefix];
  const variationLines: string[][] = [];
  const chess = new Chess(positionFen);
  let precedingMoveFen: string | null = null;
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.value === "(") {
      if (!precedingMoveFen) {
        throw new SanParseError(moves, token.value, token.moveNumber + 1);
      }
      const nextNestingDepth = nestingDepth + 1;
      assertWithinInputLimit("san-nesting", nextNestingDepth, limits.maxSanNesting);
      const variation = parseSequence(
        tokens,
        index + 1,
        moves.slice(0, -1),
        precedingMoveFen,
        true,
        nextNestingDepth,
        outputBudget,
        limits,
      );
      variationLines.push(...variation.lines);
      index = variation.nextIndex;
      continue;
    }
    if (token.value === ")") {
      if (!expectClose) throw new SanParseError(moves, token.value, token.moveNumber + 1);
      if (moves.length === prefix.length) {
        throw new SanParseError(moves, token.value, token.moveNumber + 1);
      }
      registerSanOutputLine(moves.length, outputBudget, limits);
      return {
        mainLine: moves,
        lines: [moves, ...variationLines],
        finalFen: chess.fen(),
        nextIndex: index + 1,
      };
    }

    try {
      const played = chess.move(token.value);
      if (!played) throw new Error("Illegal SAN move");
      moves.push(played.san);
      precedingMoveFen = played.before;
      assertWithinInputLimit("depth", moves.length, limits.maxDepth);
    } catch (error) {
      if (error instanceof InputLimitError) throw error;
      throw new SanParseError(moves, token.value, token.moveNumber);
    }
    index += 1;
  }

  if (expectClose) throw new SanParseError(moves, "(", tokens.at(-1)?.moveNumber ?? 1);
  registerSanOutputLine(moves.length, outputBudget, limits);
  return {
    mainLine: moves,
    lines: [moves, ...variationLines],
    finalFen: chess.fen(),
    nextIndex: index,
  };
}

function registerSanOutputLine(
  linePlies: number,
  outputBudget: SanOutputBudget,
  limits: InputLimits,
) {
  const nextLines = outputBudget.lines + 1;
  assertWithinInputLimit("line-count", nextLines, limits.maxLines);
  assertWithinInputLimit("san-output-lines", nextLines, limits.maxSanOutputLines);

  const nextPlies = outputBudget.plies + linePlies;
  assertWithinInputLimit("total-plies", nextPlies, limits.maxTotalPlies);
  assertWithinInputLimit("san-output-plies", nextPlies, limits.maxSanOutputPlies);

  outputBudget.lines = nextLines;
  outputBudget.plies = nextPlies;
}

function assertSanNodeBudget(lines: readonly (readonly string[])[], limits: InputLimits) {
  const prefixes = new Set<string>();
  let nodeCount = 1;
  assertWithinInputLimit("node-count", nodeCount, limits.maxNodes);

  for (const line of lines) {
    let prefix = "";
    for (const move of line) {
      prefix += `\u0000${move}`;
      if (prefixes.has(prefix)) continue;
      prefixes.add(prefix);
      nodeCount += 1;
      assertWithinInputLimit("node-count", nodeCount, limits.maxNodes);
    }
  }
}

function invalidValidationResult(
  errorCode: Extract<SanValidationErrorCode, "invalid-fen" | "start-position-mismatch">,
): SanValidationResult {
  return {
    valid: false,
    moves: [],
    invalidToken: "",
    tokenNumber: 1,
    errorCode,
  };
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
