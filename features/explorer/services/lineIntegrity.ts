import { Chess, DEFAULT_POSITION } from "chess.js";
import type { LineRecord, ResultTotals } from "../types";

export type LineIntegrityErrorCode =
  | "invalid-start-fen"
  | "mixed-start-fen"
  | "invalid-results"
  | "unsafe-integer";

const ERROR_MESSAGES: Record<LineIntegrityErrorCode, string> = {
  "invalid-start-fen": "The starting FEN is invalid.",
  "mixed-start-fen": "Games with different starting positions cannot be merged.",
  "invalid-results": "Game result totals must be non-negative safe integers.",
  "unsafe-integer": "Game totals exceed the safe integer limit.",
};

export class LineIntegrityError extends Error {
  readonly code: LineIntegrityErrorCode;

  constructor(code: LineIntegrityErrorCode, message = ERROR_MESSAGES[code]) {
    super(message);
    this.name = "LineIntegrityError";
    this.code = code;
  }
}

export type ResultPercentages = Pick<ResultTotals, "white" | "draw" | "black">;

export function emptyResults(): ResultTotals {
  return { white: 0, draw: 0, black: 0, unknown: 0 };
}

export function normalizeStartFen(startFen: string = DEFAULT_POSITION) {
  if (typeof startFen !== "string" || !startFen.trim()) {
    throw new LineIntegrityError("invalid-start-fen");
  }

  try {
    return new Chess(startFen.trim()).fen();
  } catch {
    throw new LineIntegrityError("invalid-start-fen");
  }
}

export function startPlyFromFen(startFen: string) {
  const normalized = normalizeStartFen(startFen);
  const fields = normalized.split(/\s+/);
  const sideToMove = fields[1];
  const fullmoveNumber = Number(fields[5]);
  if (!Number.isSafeInteger(fullmoveNumber) || fullmoveNumber < 1) {
    throw new LineIntegrityError("unsafe-integer");
  }
  const basePly = (fullmoveNumber - 1) * 2;
  if (!Number.isSafeInteger(basePly)) {
    throw new LineIntegrityError("unsafe-integer");
  }
  return checkedAddNonNegativeIntegers(basePly, sideToMove === "b" ? 1 : 0);
}

export function moveNumberFromPly(ply: number) {
  if (!Number.isSafeInteger(ply) || ply < 1) {
    throw new LineIntegrityError("unsafe-integer");
  }
  return Math.ceil(ply / 2);
}

export function movePrefixFromPly(ply: number) {
  const moveNumber = moveNumberFromPly(ply);
  return ply % 2 === 1 ? `${moveNumber}.` : `${moveNumber}...`;
}

export function checkedAddNonNegativeIntegers(left: number, right: number) {
  assertNonNegativeSafeInteger(left);
  assertNonNegativeSafeInteger(right);
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) {
    throw new LineIntegrityError("unsafe-integer");
  }
  return sum;
}

export function validateResultTotals(results: ResultTotals) {
  validateResultComponents(results);
  gameCount(results);
  return results;
}

export function addResults(target: ResultTotals, source: ResultTotals) {
  validateResultTotals(target);
  validateResultTotals(source);
  const next = {
    white: checkedAddNonNegativeIntegers(target.white, source.white),
    draw: checkedAddNonNegativeIntegers(target.draw, source.draw),
    black: checkedAddNonNegativeIntegers(target.black, source.black),
    unknown: checkedAddNonNegativeIntegers(target.unknown, source.unknown),
  };
  validateResultTotals(next);
  Object.assign(target, next);
}

export function knownResultCount(results: ResultTotals) {
  validateResultComponents(results);
  return checkedAddNonNegativeIntegers(
    checkedAddNonNegativeIntegers(results.white, results.draw),
    results.black,
  );
}

export function gameCount(results: ResultTotals) {
  return checkedAddNonNegativeIntegers(knownResultCount(results), results.unknown);
}

export function resultPercentages(results: ResultTotals): ResultPercentages {
  const total = knownResultCount(results);
  if (!total) return { white: 0, draw: 0, black: 0 };

  const entries = (["white", "draw", "black"] as const).map((key, order) => {
    const exact = (results[key] / total) * 100;
    const value = Math.floor(exact);
    return { key, order, value, remainder: exact - value };
  });
  let pointsLeft = Math.max(0, 100 - entries.reduce((sum, entry) => sum + entry.value, 0));

  for (const entry of [...entries].sort(
    (left, right) => right.remainder - left.remainder || left.order - right.order,
  )) {
    if (!pointsLeft) break;
    entry.value += 1;
    pointsLeft -= 1;
  }

  return Object.fromEntries(entries.map(({ key, value }) => [key, value])) as ResultPercentages;
}

export function assertSingleStartFen(lines: readonly LineRecord[]) {
  let expected = DEFAULT_POSITION;
  let hasExpected = false;

  for (const line of lines) {
    const normalized = normalizeStartFen(line.startFen);
    if (!hasExpected) {
      expected = normalized;
      hasExpected = true;
    } else if (normalized !== expected) {
      throw new LineIntegrityError("mixed-start-fen");
    }
  }

  return expected;
}

export function assertAggregateTotalsSafe(lines: readonly LineRecord[]) {
  const totals = emptyResults();
  for (const line of lines) addResults(totals, line.results);
  return totals;
}

function validateResultComponents(results: ResultTotals) {
  if (!results || typeof results !== "object") {
    throw new LineIntegrityError("invalid-results");
  }
  assertNonNegativeSafeInteger(results.white);
  assertNonNegativeSafeInteger(results.draw);
  assertNonNegativeSafeInteger(results.black);
  assertNonNegativeSafeInteger(results.unknown);
}

function assertNonNegativeSafeInteger(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LineIntegrityError("invalid-results");
  }
}
