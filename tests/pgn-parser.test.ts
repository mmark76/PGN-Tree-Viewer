import assert from "node:assert/strict";
import test from "node:test";
import { parsePgnCollection } from "../features/explorer/services/pgnParser";
import { buildTree, popularityPercentage, resultCount } from "../features/explorer/services/treeBuilder";
import { DEFAULT_LOCALE, firstMovesLabel, gamesLabel, importSuccess, messages } from "../features/explorer/i18n";
import { playBoardMove } from "../features/explorer/services/boardMove";
import { Chess } from "chess.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "../features/explorer/settings";
import { validateSanSequence } from "../features/explorer/services/sanParser";
import { fitTreeZoom, layoutTree } from "../features/explorer/services/treeLayout";
import { createSanPasteState, sanPasteReducer } from "../features/explorer/services/sanPasteState";
import { formatBuildVersion } from "../features/explorer/services/buildVersion";
import {
  downloadBaseName,
  parseChessTreeJson,
  serializeChessTreeJson,
  serializeTreeToPgn,
  serializeTreeToSvg,
} from "../features/explorer/services/treeFiles";

const collection = `[Event "Game one"]
[Result "1-0"]
[Opening "English Opening"]

1. c4 Nf6 2. Nc3 e5 1-0

[Event "Game two"]
[Result "0-1"]
[Opening "English Opening"]

1. c4 e5 2. Nc3 Nf6 0-1`;

test("keeps the initial move tree empty before PGN import", () => {
  const tree = buildTree([]);

  assert.equal(tree.id, "start");
  assert.equal(tree.children.length, 0);
  assert.equal(resultCount(tree.results), 0);
});

test("provides Greek and English count labels", () => {
  assert.equal(gamesLabel("el", 1), "1 παρτίδα");
  assert.equal(gamesLabel("en", 2), "2 games");
  assert.equal(firstMovesLabel("en", 1), "1 first move");
  assert.equal(importSuccess("el", 1, 0), "1 παρτίδα εισήχθη.");
  assert.equal(importSuccess("en", 2, 1), "2 games imported · 1 skipped.");
});

test("uses English as the default interface language", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(messages[DEFAULT_LOCALE].settings, "Settings");
});

test("builds a manual branch without game statistics", () => {
  const tree = buildTree([
    {
      moves: ["e4", "c5", "Nf3"],
      opening: "__manual__",
      results: { white: 0, draw: 0, black: 0 },
    },
  ]);

  assert.equal(tree.children[0].san, "e4");
  assert.equal(tree.children[0].children[0].san, "c5");
  assert.equal(tree.children[0].children[0].children[0].san, "Nf3");
  assert.equal(resultCount(tree.results), 0);
  assert.equal(popularityPercentage(tree.children[0].results, resultCount(tree.results)), null);
});

test("shows popularity only when PGN statistics exist", () => {
  assert.equal(popularityPercentage({ white: 3, draw: 1, black: 1 }, 10), 50);
  assert.equal(popularityPercentage({ white: 0, draw: 0, black: 0 }, 10), null);
  assert.equal(popularityPercentage({ white: 1, draw: 0, black: 0 }, 0), null);
});

test("accepts legal board moves and rejects illegal ones", () => {
  const startFen = new Chess().fen();
  const legal = playBoardMove(startFen, "e2", "e4");

  assert.equal(legal?.san, "e4");
  assert.match(legal?.fen ?? "", / b /);
  assert.equal(playBoardMove(startFen, "e2", "e5"), null);
});

test("normalizes saved appearance settings", () => {
  const settings = normalizeSettings({
    accentColor: "#123abc",
    lightSquareColor: "not-a-color",
    darkSquareColor: "#654321",
    textSize: "large",
    boardSize: "compact",
    font: "modern",
  });

  assert.equal(settings.accentColor, "#123abc");
  assert.equal(settings.lightSquareColor, DEFAULT_SETTINGS.lightSquareColor);
  assert.equal(settings.darkSquareColor, "#654321");
  assert.equal(settings.textSize, "large");
  assert.equal(settings.boardSize, "compact");
  assert.equal(settings.font, "modern");
});

test("parses multiple PGN games and preserves results", () => {
  const parsed = parsePgnCollection(collection);

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines[0].moves, ["c4", "Nf6", "Nc3", "e5"]);
  assert.deepEqual(parsed.lines[1].results, { white: 0, draw: 0, black: 1 });
});

test("merges shared moves into one statistical tree", () => {
  const tree = buildTree(parsePgnCollection(collection).lines);

  assert.equal(resultCount(tree.results), 2);
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].san, "c4");
  assert.equal(resultCount(tree.children[0].results), 2);
  assert.deepEqual(tree.children[0].children.map((node) => node.san), ["Nf6", "e5"]);
});

test("exports branches as PGN variations with statistics", () => {
  const tree = buildTree(parsePgnCollection(collection).lines);
  const pgn = serializeTreeToPgn(tree);

  assert.match(pgn, /\[Event "Chess Tree Builder Export"\]/);
  assert.match(pgn, /1\. c4 \{Games: 2; White: 1; Draw: 0; Black: 1\}/);
  assert.match(pgn, /\(1\.\.\. e5/);
  assert.match(pgn, /\*\n$/);
  assert.doesNotThrow(() => new Chess().loadPgn(pgn));
});

test("round-trips a complete Chess Tree Builder JSON file", () => {
  const lines = parsePgnCollection(collection).lines;
  const json = serializeChessTreeJson(lines, DEFAULT_SETTINGS, "study.pgn");
  const restored = parseChessTreeJson(json);

  assert.deepEqual(restored.lines, lines);
  assert.deepEqual(restored.settings, DEFAULT_SETTINGS);
  assert.equal(restored.sourceFileName, "study.pgn");
  assert.throws(() => parseChessTreeJson('{"format":"other"}'));
});

test("exports the complete tree as a scalable SVG image", () => {
  const tree = buildTree(parsePgnCollection(collection).lines);
  const svg = serializeTreeToSvg(tree, "en", DEFAULT_SETTINGS.accentColor);

  assert.match(svg, /^<\?xml version="1\.0"/);
  assert.match(svg, /<svg[^>]+role="img"/);
  assert.match(svg, />c4<\/text>/);
  assert.match(svg, />50%<\/text>/);
  assert.match(svg, /chesstree\.markellosecosystem\.com/);
});

test("creates safe download file names", () => {
  assert.equal(downloadBaseName("Sicilian study.pgn"), "Sicilian-study-tree");
  assert.equal(downloadBaseName("Sicilian-study-tree.chesstree.json"), "Sicilian-study-tree");
  assert.equal(downloadBaseName("Sicilian-study-tree.chess-tree-builder.json"), "Sicilian-study-tree");
  assert.equal(downloadBaseName(""), "chess-tree-builder");
});

test("validates numbered SAN text and normalizes the moves", () => {
  const result = validateSanSequence("1. e4 e5 2. Nf3 Nc6 3. Bb5");
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.moves, ["e4", "e5", "Nf3", "Nc6", "Bb5"]);
    assert.deepEqual(result.lines, [["e4", "e5", "Nf3", "Nc6", "Bb5"]]);
  }
});

test("reports the first invalid SAN move", () => {
  const result = validateSanSequence("1. e4 e5 2. NotAMove Nc6");
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.invalidToken, "NotAMove");
    assert.equal(result.tokenNumber, 3);
    assert.deepEqual(result.moves, ["e4", "e5"]);
  }
});

test("validates SAN from a selected position", () => {
  const chess = new Chess();
  chess.move("e4");
  const result = validateSanSequence("c5 2. Nf3", chess.fen());
  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.moves, ["c5", "Nf3"]);
});

test("extracts the main line and variations from a complete pasted PGN", () => {
  const pastedPgn = `[Event "English Reversed Dragon for White by GM"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "Main line"]
[Black "?"]
[Result "*"]

1. Nf3 d5 2. g3 c5 (2... Nf6 3. Bg2) 3. Bg2 Nc6 $1
4. O-O {Main-line comment} e5 *`;
  const result = validateSanSequence(pastedPgn);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.moves, ["Nf3", "d5", "g3", "c5", "Bg2", "Nc6", "O-O", "e5"]);
    assert.deepEqual(result.lines, [
      ["Nf3", "d5", "g3", "c5", "Bg2", "Nc6", "O-O", "e5"],
      ["Nf3", "d5", "g3", "Nf6", "Bg2"],
    ]);
  }
});

test("preserves nested PGN variations as separate tree lines", () => {
  const result = validateSanSequence("1. e4 e5 (1... c5 2. Nf3 (2. Nc3) d6) 2. Nf3 Nc6");

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.lines, [
      ["e4", "e5", "Nf3", "Nc6"],
      ["e4", "c5", "Nf3", "d6"],
      ["e4", "c5", "Nc3"],
    ]);
    const tree = buildTree(result.lines.map((moves) => ({
      moves,
      opening: "__manual__",
      results: { white: 0, draw: 0, black: 0 },
    })));
    const e4 = tree.children.find((node) => node.san === "e4")!;
    assert.deepEqual(e4.children.map((node) => node.san), ["e5", "c5"]);
    const c5 = e4.children.find((node) => node.san === "c5")!;
    assert.deepEqual(c5.children.map((node) => node.san), ["Nf3", "Nc3"]);
  }
});

test("lays out the move tree to the right or downward", () => {
  const tree = buildTree(parsePgnCollection(collection).lines);
  const right = layoutTree(tree, new Set(), "right");
  const down = layoutTree(tree, new Set(), "down");
  const rightRoot = right.nodes.find((node) => node.id === "start")!;
  const rightChild = right.nodes.find((node) => node.parentId === "start")!;
  const downRoot = down.nodes.find((node) => node.id === "start")!;
  const downChild = down.nodes.find((node) => node.parentId === "start")!;

  assert.ok(rightChild.x > rightRoot.x);
  assert.ok(downChild.y > downRoot.y);
});

test("fits the complete tree inside the available viewport", () => {
  assert.equal(fitTreeZoom(2000, 1000, 1000, 600), 0.472);
  assert.equal(fitTreeZoom(400, 300, 1000, 700), 1);
});

test("clears validated SAN when clipboard content is replaced with empty text", () => {
  const valid = validateSanSequence("e4");
  let state = createSanPasteState();
  state = sanPasteReducer(state, { type: "edit", value: "e4" });
  state = sanPasteReducer(state, { type: "validated", fromStart: valid, fromSelected: valid });
  state = sanPasteReducer(state, { type: "replace", value: "" });

  assert.equal(state.value, "");
  assert.equal(state.fromStart, null);
  assert.equal(state.fromSelected, null);
});

test("marks uncommitted builds as dirty", () => {
  const clean = formatBuildVersion(new Date("2026-08-10T15:46:00Z"), "abcdef0", false);
  const dirty = formatBuildVersion(new Date("2026-08-10T15:46:00Z"), "abcdef0", true);

  assert.equal(clean, "version_20260810_1846_commit_abcdef0");
  assert.equal(dirty, "version_20260810_1846_commit_abcdef0_dirty");
});
