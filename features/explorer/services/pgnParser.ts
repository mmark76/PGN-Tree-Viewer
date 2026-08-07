import { Chess } from "chess.js";
import type { LineRecord, ResultTotals } from "../types";

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
      lines.push({
        moves,
        opening: openingName(headers),
        results: resultFromHeader(headers.Result),
      });
    } catch {
      skippedCount += 1;
    }
  }

  return { lines, gameCount: lines.length, skippedCount };
}

function splitGames(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];

  const starts = [...normalized.matchAll(/^\s*\[Event\s/gm)].map((match) => match.index ?? 0);
  if (starts.length <= 1) return [normalized];

  return starts.map((start, index) =>
    normalized.slice(start, starts[index + 1] ?? normalized.length).trim(),
  ).filter(Boolean);
}

function resultFromHeader(result?: string): ResultTotals {
  if (result === "1-0") return { white: 1, draw: 0, black: 0 };
  if (result === "0-1") return { white: 0, draw: 0, black: 1 };
  return { white: 0, draw: 1, black: 0 };
}

function openingName(headers: Record<string, string>) {
  if (headers.Opening) return headers.Opening;
  if (headers.ECO) return `ECO ${headers.ECO}`;
  if (headers.Event && headers.Event !== "?") return headers.Event;
  return "Εισαγόμενο PGN";
}
