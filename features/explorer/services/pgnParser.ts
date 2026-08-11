import { Chess, DEFAULT_POSITION } from "chess.js";
import type { LineRecord, ResultTotals } from "../types";
import {
  assertAggregateTotalsSafe,
  assertSingleStartFen,
  checkedAddNonNegativeIntegers,
  normalizeStartFen,
  startPlyFromFen,
} from "./lineIntegrity";

export type PgnImportResult = {
  lines: LineRecord[];
  gameCount: number;
  skippedCount: number;
};

export function parsePgnCollection(text: string): PgnImportResult {
  const blocks = splitGames(text);
  const lines: LineRecord[] = [];
  let skippedCount = 0;

  for (const block of blocks) {
    try {
      const chess = new Chess();
      chess.loadPgn(block, { strict: false });
      const moves = chess.history();
      if (!moves.length) {
        skippedCount += 1;
        continue;
      }

      const headers = chess.getHeaders();
      const startFen = normalizeStartFen(headerValue(headers, "FEN") ?? DEFAULT_POSITION);
      checkedAddNonNegativeIntegers(startPlyFromFen(startFen), moves.length);
      lines.push({
        moves,
        opening: openingName(headers),
        results: resultFromHeader(headerValue(headers, "Result")),
        startFen,
      });
    } catch {
      skippedCount += 1;
    }
  }

  assertSingleStartFen(lines);
  assertAggregateTotalsSafe(lines);
  return { lines, gameCount: lines.length, skippedCount };
}

function splitGames(text: string) {
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
    if (block) blocks.push(block);
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
