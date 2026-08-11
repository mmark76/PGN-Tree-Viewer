import type { LineRecord } from "../types";

const MEBIBYTE = 1024 * 1024;

export const DEFAULT_INPUT_LIMITS = {
  maxFileBytes: 8 * MEBIBYTE,
  maxGames: 5_000,
  maxLines: 5_000,
  maxTotalPlies: 200_000,
  maxDepth: 512,
  maxNodes: 5_000,
  maxPgnBlockBytes: MEBIBYTE,
  maxSanCharacters: 256 * 1024,
  maxSanTokens: 20_000,
  maxSanOutputLines: 1_000,
  maxSanOutputPlies: 50_000,
  maxSanNesting: 32,
} as const;

export type InputLimits = {
  [Key in keyof typeof DEFAULT_INPUT_LIMITS]: number;
};

export type InputLimitOverrides = Partial<InputLimits>;

export type InputLimitErrorCode =
  | "file-size"
  | "game-count"
  | "line-count"
  | "total-plies"
  | "depth"
  | "node-count"
  | "pgn-block-size"
  | "san-length"
  | "san-token-count"
  | "san-output-lines"
  | "san-output-plies"
  | "san-nesting";

const LIMIT_LABELS: Record<InputLimitErrorCode, string> = {
  "file-size": "The selected file is too large",
  "game-count": "The PGN contains too many games",
  "line-count": "The input contains too many lines",
  "total-plies": "The input contains too many moves",
  depth: "A line is too deep",
  "node-count": "The tree contains too many nodes",
  "pgn-block-size": "A PGN game is too large",
  "san-length": "The pasted SAN text is too long",
  "san-token-count": "The pasted SAN text contains too many tokens",
  "san-output-lines": "The pasted SAN text produces too many lines",
  "san-output-plies": "The pasted SAN text produces too many moves",
  "san-nesting": "The pasted SAN variations are nested too deeply",
};

export class InputLimitError extends Error {
  readonly code: InputLimitErrorCode;
  readonly limit: number;
  readonly actual: number;

  constructor(code: InputLimitErrorCode, limit: number, actual: number) {
    super(`${LIMIT_LABELS[code]} (limit: ${limit}, received: ${actual}).`);
    this.name = "InputLimitError";
    this.code = code;
    this.limit = limit;
    this.actual = actual;
  }
}

export function resolveInputLimits(overrides: InputLimitOverrides = {}): InputLimits {
  const limits = { ...DEFAULT_INPUT_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`${name} must be a non-negative safe integer.`);
    }
  }
  return limits;
}

export function assertWithinInputLimit(
  code: InputLimitErrorCode,
  actual: number,
  limit: number,
) {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new TypeError("Input limits must be non-negative safe integers.");
  }
  if (!Number.isSafeInteger(actual) || actual < 0 || actual > limit) {
    throw new InputLimitError(code, limit, actual);
  }
}

export function assertFileSizeWithinLimit(bytes: number, overrides: InputLimitOverrides = {}) {
  const { maxFileBytes } = resolveInputLimits(overrides);
  assertWithinInputLimit("file-size", bytes, maxFileBytes);
}

export function assertTextByteLengthWithinLimit(
  text: string,
  code: "file-size" | "pgn-block-size",
  limit: number,
) {
  const bytes = new TextEncoder().encode(text).byteLength;
  assertWithinInputLimit(code, bytes, limit);
  return bytes;
}

export function assertLineCollectionWithinLimits(
  lines: readonly LineRecord[],
  overrides: InputLimitOverrides = {},
) {
  const limits = resolveInputLimits(overrides);
  assertWithinInputLimit("line-count", lines.length, limits.maxLines);

  let totalPlies = 0;
  for (const line of lines) {
    const depth = line.moves.length;
    assertWithinInputLimit("depth", depth, limits.maxDepth);
    totalPlies += depth;
    assertWithinInputLimit("total-plies", totalPlies, limits.maxTotalPlies);
  }

  return { lineCount: lines.length, totalPlies };
}

export function assertNodeCountWithinLimit(
  nodeCount: number,
  overrides: InputLimitOverrides = {},
) {
  const { maxNodes } = resolveInputLimits(overrides);
  assertWithinInputLimit("node-count", nodeCount, maxNodes);
}
