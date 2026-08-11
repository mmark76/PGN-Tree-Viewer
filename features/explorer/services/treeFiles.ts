import { Chess, DEFAULT_POSITION } from "chess.js";
import { normalizeSettings } from "../settings";
import type { ExplorerSettings } from "../settings";
import type { TreeDirection } from "../settings";
import type { LineRecord, ResultTotals, TreeNode } from "../types";
import { gamesLabel } from "../i18n";
import type { Locale } from "../i18n";
import { layoutTree } from "./treeLayout";
import { popularityPercentage, resultCount } from "./treeBuilder";
import {
  assertAggregateTotalsSafe,
  assertSingleStartFen,
  checkedAddNonNegativeIntegers,
  gameCount,
  movePrefixFromPly,
  normalizeStartFen,
  startPlyFromFen,
} from "./lineIntegrity";

export const CHESSTREE_FILE_FORMAT = "chesstree";
export const CHESSTREE_FILE_VERSION = 1;

export type ChessTreeFile = {
  format: typeof CHESSTREE_FILE_FORMAT;
  version: typeof CHESSTREE_FILE_VERSION;
  sourceFileName: string | null;
  lines: LineRecord[];
  settings: ExplorerSettings;
};

export function serializeChessTreeJson(
  lines: LineRecord[],
  settings: ExplorerSettings,
  sourceFileName = "",
) {
  assertSingleStartFen(lines);
  assertAggregateTotalsSafe(lines);
  const file: ChessTreeFile = {
    format: CHESSTREE_FILE_FORMAT,
    version: CHESSTREE_FILE_VERSION,
    sourceFileName: sourceFileName || null,
    lines,
    settings,
  };

  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseChessTreeJson(content: string): ChessTreeFile {
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid ChessTree file");

  const candidate = parsed as Partial<ChessTreeFile>;
  if (candidate.format !== CHESSTREE_FILE_FORMAT || candidate.version !== CHESSTREE_FILE_VERSION) {
    throw new Error("Unsupported ChessTree file");
  }
  if (!Array.isArray(candidate.lines) || !candidate.lines.length || candidate.lines.length > 20_000) {
    throw new Error("Invalid ChessTree lines");
  }

  const lines = candidate.lines.map(validateLine);
  assertSingleStartFen(lines);
  assertAggregateTotalsSafe(lines);

  return {
    format: CHESSTREE_FILE_FORMAT,
    version: CHESSTREE_FILE_VERSION,
    sourceFileName: typeof candidate.sourceFileName === "string" ? candidate.sourceFileName : null,
    lines,
    settings: normalizeSettings(candidate.settings),
  };
}

function validateLine(value: unknown): LineRecord {
  if (!value || typeof value !== "object") throw new Error("Invalid ChessTree line");
  const candidate = value as Partial<LineRecord>;
  if (!Array.isArray(candidate.moves) || !candidate.moves.length || candidate.moves.length > 1_000) {
    throw new Error("Invalid ChessTree moves");
  }

  const moves = candidate.moves.map((move) => {
    if (typeof move !== "string" || !move.trim() || move.length > 40) {
      throw new Error("Invalid ChessTree move");
    }
    return move.trim();
  });

  const rawStartFen = (candidate as { startFen?: unknown }).startFen;
  if (rawStartFen !== undefined && typeof rawStartFen !== "string") {
    throw new Error("Invalid ChessTree start FEN");
  }
  const startFen = normalizeStartFen(rawStartFen ?? DEFAULT_POSITION);
  checkedAddNonNegativeIntegers(startPlyFromFen(startFen), moves.length);
  const chess = new Chess(startFen);
  for (const move of moves) {
    try {
      if (!chess.move(move)) throw new Error("Illegal ChessTree move");
    } catch {
      throw new Error("Illegal ChessTree move");
    }
  }

  return {
    moves,
    opening:
      typeof candidate.opening === "string" && candidate.opening.length <= 200
        ? candidate.opening
        : "__manual__",
    results: validateResults(candidate.results),
    startFen,
  };
}

function validateResults(value: unknown): ResultTotals {
  if (!value || typeof value !== "object") throw new Error("Invalid ChessTree results");
  const candidate = value as Partial<ResultTotals>;
  const unknown = candidate.unknown ?? 0;
  const values = [candidate.white, candidate.draw, candidate.black, unknown];
  if (values.some((count) => !Number.isSafeInteger(count) || Number(count) < 0)) {
    throw new Error("Invalid ChessTree results");
  }
  const results = {
    white: candidate.white as number,
    draw: candidate.draw as number,
    black: candidate.black as number,
    unknown,
  };
  gameCount(results);
  return results;
}

export function serializeTreeToPgn(root: TreeNode) {
  if (!root.children.length) throw new Error("Cannot export an empty tree");
  const startFen = normalizeStartFen(root.fen);
  const moves = serializeContinuation(root);
  const headers = [
    '[Event "Chess Tree Builder Export"]',
    '[Site "chesstree.markellosecosystem.com"]',
    '[Result "*"]',
  ];
  if (startFen !== DEFAULT_POSITION) {
    headers.push('[SetUp "1"]', `[FEN "${startFen}"]`);
  }
  return [
    ...headers,
    "",
    `${moves} *`,
    "",
  ].join("\n");
}

export function serializeTreeToSvg(root: TreeNode, locale: Locale, accentColor: string, direction: TreeDirection = "right") {
  if (!root.children.length) throw new Error("Cannot export an empty tree");
  const layout = layoutTree(root, new Set(), direction);
  const edgeMarkup = layout.edges
    .map(({ from, to }) => {
      const midX = from.x + (to.x - from.x) * 0.52;
      const midY = from.y + (to.y - from.y) * 0.52;
      const path = direction === "right"
        ? `M ${from.x + 29} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 29} ${to.y}`
        : `M ${from.x} ${from.y + 29} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 29}`;
      return `<path d="${path}"/>`;
    })
    .join("");
  const nodeMarkup = layout.nodes.map((node) => serializeSvgNode(node, locale, accentColor)).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="title description">`,
    '<title id="title">Chess Tree Builder move tree</title>',
    '<desc id="description">Chess opening move tree exported from Chess Tree Builder.</desc>',
    '<rect width="100%" height="100%" fill="#f3f1ea"/>',
    `<g fill="none" stroke="${accentColor}" stroke-opacity="0.42" stroke-width="2">${edgeMarkup}</g>`,
    `<g font-family="Arial, Helvetica, sans-serif">${nodeMarkup}</g>`,
    `<text x="24" y="${layout.height - 20}" fill="#66736b" font-family="Arial, Helvetica, sans-serif" font-size="11">chesstree.markellosecosystem.com</text>`,
    "</svg>",
    "",
  ].join("\n");
}

function serializeSvgNode(node: TreeNode & { x: number; y: number; parentCount: number }, locale: Locale, accentColor: string) {
  const radius = 29;
  const total = resultCount(node.results);
  const share = popularityPercentage(node.results, node.parentCount);
  const isRoot = node.id === "start";
  const fill = isRoot ? accentColor : "#fffef9";
  const foreground = isRoot ? "#ffffff" : "#17211c";
  const label = isRoot ? (locale === "el" ? "Αρχή" : "Start") : node.san;
  const countLabel = total ? gamesLabel(locale, total) : "";

  return [
    `<g>`,
    `<circle cx="${node.x}" cy="${node.y}" r="${radius}" fill="${fill}" stroke="${accentColor}" stroke-width="${isRoot ? 0 : 1.5}"/>`,
    `<text x="${node.x}" y="${node.y + 5}" text-anchor="middle" fill="${foreground}" font-size="${isRoot ? 13 : 14}" font-weight="700">${escapeXml(label)}</text>`,
    share === null
      ? ""
      : `<text x="${node.x + 27}" y="${node.y + 31}" text-anchor="end" fill="${accentColor}" font-size="9" font-weight="700">${share}%</text>`,
    countLabel ? `<title>${escapeXml(`${label}, ${countLabel}`)}</title>` : "",
    "</g>",
  ].join("");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function serializeContinuation(parent: TreeNode): string {
  const [main, ...alternatives] = parent.children;
  if (!main) return "";

  const chunks = [serializeMove(main)];
  chunks.push(...alternatives.map((alternative) => `(${serializeBranch(alternative)})`));
  const continuation = serializeContinuation(main);
  if (continuation) chunks.push(continuation);
  return chunks.join(" ");
}

function serializeBranch(node: TreeNode): string {
  const continuation = serializeContinuation(node);
  return continuation ? `${serializeMove(node)} ${continuation}` : serializeMove(node);
}

function serializeMove(node: TreeNode) {
  const prefix = movePrefixFromPly(node.ply);
  const total = resultCount(node.results);
  const unknownStatistics = node.results.unknown ? `; Unknown: ${node.results.unknown}` : "";
  const statistics = total
    ? ` {Games: ${total}; White: ${node.results.white}; Draw: ${node.results.draw}; Black: ${node.results.black}${unknownStatistics}}`
    : "";
  return `${prefix} ${node.san}${statistics}`;
}

export function downloadBaseName(sourceFileName: string) {
  const withoutExtension = sourceFileName
    .replace(/\.chess-tree-builder\.json$/i, "")
    .replace(/\.chesstree\.json$/i, "")
    .replace(/\.(pgn|json|svg)$/i, "")
    .trim();
  const safeName = withoutExtension
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return safeName
    ? safeName.toLowerCase().endsWith("-tree")
      ? safeName
      : `${safeName}-tree`
    : "chess-tree-builder";
}

export function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
