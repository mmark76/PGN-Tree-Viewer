import { Chess, DEFAULT_POSITION } from "chess.js";
import type { LineRecord, ResultTotals } from "../types";
import type { PreparedTreeLine, PreparedTreeMove } from "./treeBuilder";
import {
  assertAggregateTotalsSafe,
  assertSingleStartFen,
  checkedAddNonNegativeIntegers,
  normalizeStartFen,
  startPlyFromFen,
} from "./lineIntegrity";
import {
  assertTextByteLengthWithinLimit,
  assertWithinInputLimit,
  InputLimitError,
  type InputLimitOverrides,
  type InputLimits,
  resolveInputLimits,
} from "./inputLimits";
import { validateSanSequence } from "./sanParser";

export type PgnImportResult = {
  lines: LineRecord[];
  preparedLines: PreparedTreeLine[];
  gameCount: number;
  skippedCount: number;
};

export function parsePgnCollection(
  text: string,
  limitOverrides: InputLimitOverrides = {},
): PgnImportResult {
  const limits = resolveInputLimits(limitOverrides);
  assertTextByteLengthWithinLimit(text, "file-size", limits.maxFileBytes);
  const blocks = splitGames(text, limits);
  preflightPgnMovetextLimits(blocks, limits);
  const lines: LineRecord[] = [];
  const preparedLines: PreparedTreeLine[] = [];
  const seenNodeIds = new Set(["start"]);
  let skippedCount = 0;
  let importedGameCount = 0;
  let totalPlies = 0;

  for (const block of blocks) {
    try {
      // chess.js remains the authority for PGN headers and main-line validity,
      // while the variation-aware SAN parser expands every recursive RAV into
      // a separate tree line. chess.history() alone only exposes the main line.
      const chess = new Chess();
      chess.loadPgn(block, { strict: false });
      const history = chess.history({ verbose: true });
      if (!history.length) {
        skippedCount += 1;
        continue;
      }

      const headers = chess.getHeaders();
      const startFen = normalizeStartFen(headerValue(headers, "FEN") ?? DEFAULT_POSITION);
      const parsed = validateSanSequence(block, startFen, {
        ...limitOverrides,
        // File PGN blocks have their own byte cap; do not accidentally impose
        // the smaller clipboard-character cap on otherwise valid file imports.
        maxSanCharacters: limits.maxPgnBlockBytes,
        maxSanOutputLines: limits.maxLines,
        maxSanOutputPlies: limits.maxTotalPlies,
      });
      if (!parsed.valid) {
        if (parsed.errorCode === "input-limit" && parsed.inputLimit) {
          throw new InputLimitError(
            parsed.inputLimit.code,
            parsed.inputLimit.limit,
            parsed.inputLimit.actual,
          );
        }
        throw new Error("Invalid PGN variation sequence.");
      }

      const opening = openingName(headers);
      const result = resultFromHeader(headerValue(headers, "Result"));
      checkedAddNonNegativeIntegers(startPlyFromFen(startFen), parsed.moves.length);

      for (const [lineIndex, moves] of parsed.lines.entries()) {
        assertWithinInputLimit("depth", moves.length, limits.maxDepth);
        const nextTotalPlies = totalPlies + moves.length;
        assertWithinInputLimit("total-plies", nextTotalPlies, limits.maxTotalPlies);
        assertWithinInputLimit("line-count", lines.length + 1, limits.maxLines);

        const preparedMoves = prepareLineMoves(moves, startFen);
        recordPreparedNodePaths(preparedMoves, seenNodeIds, limits);
        const line: LineRecord = {
          moves,
          opening,
          // Count the source game once. Variation-only lines are structural and
          // must not multiply game/result totals at the root or shared prefixes.
          results: lineIndex === 0 ? result : emptyResultTotals(),
          startFen,
        };
        lines.push(line);
        preparedLines.push({ line, moves: preparedMoves });
        totalPlies = nextTotalPlies;
      }
      importedGameCount += 1;
    } catch (error) {
      if (error instanceof InputLimitError) throw error;
      skippedCount += 1;
    }
  }

  assertSingleStartFen(lines);
  assertAggregateTotalsSafe(lines);
  return { lines, preparedLines, gameCount: importedGameCount, skippedCount };
}

function preflightPgnMovetextLimits(blocks: readonly string[], limits: InputLimits) {
  let totalPlies = 0;
  for (const block of blocks) {
    const encounteredPlies = countPgnMainlineMoveTokens(block);
    assertWithinInputLimit("depth", encounteredPlies, limits.maxDepth);
    totalPlies += encounteredPlies;
    assertWithinInputLimit("total-plies", totalPlies, limits.maxTotalPlies);
  }
}

export function countPgnMainlineMoveTokens(block: string) {
  let moveCount = 0;
  let braceDepth = 0;
  let variationDepth = 0;
  let token = "";

  const flushToken = () => {
    if (token && isPgnMoveCandidate(token)) moveCount += 1;
    token = "";
  };

  for (const line of block.split(/\r?\n/)) {
    if (braceDepth === 0 && variationDepth === 0 && isTagLine(line)) continue;
    if (braceDepth === 0 && /^\s*%/.test(line)) continue;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (braceDepth > 0) {
        if (character === "{") braceDepth += 1;
        if (character === "}") braceDepth -= 1;
        continue;
      }
      if (character === ";") {
        flushToken();
        break;
      }
      if (character === "{") {
        flushToken();
        braceDepth = 1;
        continue;
      }
      if (character === "(") {
        flushToken();
        variationDepth += 1;
        continue;
      }
      if (character === ")") {
        flushToken();
        variationDepth = Math.max(0, variationDepth - 1);
        continue;
      }
      if (/\s/.test(character)) {
        flushToken();
        continue;
      }
      if (variationDepth === 0) token += character;
    }
    flushToken();
  }

  return moveCount;
}

function isPgnMoveCandidate(rawToken: string) {
  let token = rawToken;
  token = token.replace(/^\d+\.(?:\.\.)?/, "");
  token = token.replace(/^\.\.\./, "");
  token = token.replace(/\$\d+/g, "");
  token = token.replace(/[!?]+$/g, "");

  if (!token || /^\.+$/.test(token)) return false;
  if (/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token)) return false;
  if (/^e\.?p\.?$/i.test(token)) return false;
  return true;
}

function prepareLineMoves(moves: readonly string[], startFen: string): PreparedTreeMove[] {
  const chess = new Chess(startFen);
  return moves.map((moveText) => {
    const move = chess.move(moveText);
    if (!move) throw new Error("Illegal move in PGN variation.");
    return {
      san: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      beforeFen: move.before,
      afterFen: move.after,
    };
  });
}

function recordPreparedNodePaths(
  moves: readonly PreparedTreeMove[],
  seenNodeIds: Set<string>,
  limits: InputLimits,
) {
  let parentId = "start";
  for (const move of moves) {
    const moveKey = `${move.from}${move.to}${move.promotion ?? ""}`;
    const nodeId = `${parentId}-${moveKey}`;
    if (!seenNodeIds.has(nodeId)) {
      assertWithinInputLimit("node-count", seenNodeIds.size + 1, limits.maxNodes);
      seenNodeIds.add(nodeId);
    }
    parentId = nodeId;
  }
}

function splitGames(text: string, limits: InputLimits) {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];

  const blocks: string[] = [];
  let current: string[] = [];
  let movetextStarted = false;
  let gameFinished = false;
  let braceDepth = 0;
  let variationDepth = 0;

  const flush = () => {
    const block = current.join("\n").trim();
    if (block) {
      assertTextByteLengthWithinLimit(block, "pgn-block-size", limits.maxPgnBlockBytes);
      assertWithinInputLimit("game-count", blocks.length + 1, limits.maxGames);
      blocks.push(block);
    }
    current = [];
    movetextStarted = false;
    gameFinished = false;
    braceDepth = 0;
    variationDepth = 0;
  };

  for (const line of normalized.split(/\r?\n/)) {
    const isHeader = braceDepth === 0 && variationDepth === 0 && isTagLine(line);
    const scan = isHeader
      ? { hasContent: false, hasTerminalResult: false, braceDepth, variationDepth }
      : scanMovetextLine(line, braceDepth, variationDepth);
    const startsNextGame =
      (gameFinished && (isHeader || scan.hasContent)) ||
      (isHeader && movetextStarted);

    if (startsNextGame) flush();
    current.push(line);

    if (!isHeader) {
      braceDepth = scan.braceDepth;
      variationDepth = scan.variationDepth;
      movetextStarted ||= scan.hasContent;
      gameFinished ||= scan.hasTerminalResult;
    }
  }

  flush();
  return blocks;
}

function resultFromHeader(result?: string): ResultTotals {
  if (result === "1-0") return { white: 1, draw: 0, black: 0, unknown: 0 };
  if (result === "0-1") return { white: 0, draw: 0, black: 1, unknown: 0 };
  if (result === "1/2-1/2") return { white: 0, draw: 1, black: 0, unknown: 0 };
  return { white: 0, draw: 0, black: 0, unknown: 1 };
}

function emptyResultTotals(): ResultTotals {
  return { white: 0, draw: 0, black: 0, unknown: 0 };
}

function openingName(headers: Record<string, string>) {
  const opening = headerValue(headers, "Opening");
  const eco = headerValue(headers, "ECO");
  const event = headerValue(headers, "Event");
  if (opening) return opening;
  if (eco) return `ECO ${eco}`;
  if (event && event !== "?") return event;
  return "PGN";
}

function headerValue(headers: Record<string, string>, name: string) {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
}

function isTagLine(line: string) {
  return /^\s*\[\s*[A-Za-z0-9_]+\s+"(?:[^"\\]|\\.)*"\s*\]\s*$/.test(line);
}

function scanMovetextLine(line: string, initialBraceDepth: number, initialVariationDepth: number) {
  let braceDepth = initialBraceDepth;
  let variationDepth = initialVariationDepth;
  let visible = "";

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (braceDepth > 0) {
      if (character === "{") braceDepth += 1;
      if (character === "}") braceDepth -= 1;
      continue;
    }
    if (character === ";") break;
    if (character === "{") {
      braceDepth = 1;
      visible += " ";
      continue;
    }
    if (character === "(") {
      variationDepth += 1;
      visible += " ";
      continue;
    }
    if (character === ")") {
      variationDepth = Math.max(0, variationDepth - 1);
      visible += " ";
      continue;
    }
    if (variationDepth === 0) visible += character;
  }

  const trimmed = visible.trim();
  return {
    hasContent: Boolean(trimmed),
    hasTerminalResult: /(?:^|\s)(?:1-0|0-1|1\/2-1\/2|\*)(?=\s|$)/.test(trimmed),
    braceDepth,
    variationDepth,
  };
}
