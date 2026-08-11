import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Chess } from "chess.js";
import { PositionInspector } from "../features/explorer/components/PositionInspector";
import { processImportText } from "../features/explorer/services/importPipeline";
import { InputLimitError } from "../features/explorer/services/inputLimits";
import { parsePgnCollection } from "../features/explorer/services/pgnParser";
import { validateSanSequence } from "../features/explorer/services/sanParser";
import {
  buildTreeFromPreparedLines,
  gameCount,
  type PreparedTreeLine,
} from "../features/explorer/services/treeBuilder";

test("file import and Paste PGN build the same recursive variation paths", () => {
  const pgn = `[Event "Parity"]
[Result "1-0"]
[Opening "Open Game"]

1. e4! {Metadata example:
[FEN "8/8/8/8/8/8/5K2/7k b - - 0 37"]
This is comment text, not a header.}
(1. d4 d5 2. c4) e5
(1... c5 $1 2. Nf3 (2. Nc3) d6)
(1... e6 {French sibling})
2. Nf3 Nc6 1-0`;

  const pasted = validateSanSequence(pgn);
  assert.equal(pasted.valid, true);
  if (!pasted.valid) return;

  const parsed = parsePgnCollection(pgn);
  const imported = processImportText(pgn, "pgn");

  assert.equal(parsed.gameCount, 1);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines.map((line) => line.moves), pasted.lines);
  assert.deepEqual(imported.lines, parsed.lines);
  assert.deepEqual(imported.tree, buildTreeFromPreparedLines(parsed.preparedLines));
  assert.equal(JSON.stringify(structuredClone(imported)), JSON.stringify(imported));
  assert.equal(gameCount(imported.tree.results), 1);
  assert.deepEqual(parsed.lines.map((line) => gameCount(line.results)), [1, 0, 0, 0, 0]);
});

test("headerless collections split immediately after same-line top-level results", () => {
  const parsed = parsePgnCollection(
    "1. e4 {1-0 is comment text} e5 (1... c5 {0-1 is nested}) 1-0 "
      + "1. d4 d5 0-1",
  );

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines.map((line) => line.moves), [
    ["e4", "e5"],
    ["e4", "c5"],
    ["d4", "d5"],
  ]);
  assert.deepEqual(parsed.lines.map((line) => gameCount(line.results)), [1, 0, 1]);

  const semicolon = parsePgnCollection(`1. e4 e5 1-0 ; 0-1 is comment text
1. d4 d5 0-1`);
  assert.equal(semicolon.gameCount, 2);
  assert.deepEqual(semicolon.lines.map((line) => line.moves), [["e4", "e5"], ["d4", "d5"]]);

  const bomAndCrLf = parsePgnCollection(
    "\uFEFF[Result \"1-0\"]\r\n\r\n1. e4 1-0\r\n\r\n"
      + "[Result \"0-1\"]\r\n\r\n1. d4 0-1\r\n",
  );
  assert.equal(bomAndCrLf.gameCount, 2);
  assert.deepEqual(bomAndCrLf.lines.map((line) => line.moves), [["e4"], ["d4"]]);
});

test("an illegal or malformed RAV skips its source game without importing a partial tree", () => {
  const mixed = parsePgnCollection(`1. e4 e5 (1... NotAMove) 1-0
1. d4 d5 0-1`);
  assert.equal(mixed.gameCount, 1);
  assert.equal(mixed.skippedCount, 1);
  assert.deepEqual(mixed.lines.map((line) => line.moves), [["d4", "d5"]]);

  const unclosed = parsePgnCollection("1. e4 e5 (1... c5 *");
  assert.equal(unclosed.gameCount, 0);
  assert.equal(unclosed.skippedCount, 1);
  assert.deepEqual(unclosed.lines, []);
});

test("duplicate RAVs stay structural and only actually played paths receive game statistics", () => {
  const parsed = parsePgnCollection(`[Event "Main e5"]
[Result "1-0"]

1. e4 e5 (1... c5) (1... c5) 1-0

[Event "Main c5"]
[Result "0-1"]

1. e4 c5 0-1`);
  const tree = buildTreeFromPreparedLines(parsed.preparedLines);
  const e4 = tree.children.find((node) => node.san === "e4");
  const e5 = e4?.children.find((node) => node.san === "e5");
  const c5 = e4?.children.find((node) => node.san === "c5");

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.lines.length, 3);
  assert.equal(gameCount(tree.results), 2);
  assert.equal(gameCount(e4?.results ?? { white: 0, draw: 0, black: 0, unknown: 0 }), 2);
  assert.equal(gameCount(e5?.results ?? { white: 0, draw: 0, black: 0, unknown: 0 }), 1);
  assert.equal(gameCount(c5?.results ?? { white: 0, draw: 0, black: 0, unknown: 0 }), 1);
});

test("RAV nesting limits run before chess.js can recurse into hostile input", () => {
  const nesting = 2_500;
  const pgn = `1. e4 ${"(1. d4 ".repeat(nesting)}${")".repeat(nesting)} *`;

  assert.throws(() => parsePgnCollection(pgn), (error: unknown) => {
    assert.ok(error instanceof InputLimitError);
    assert.equal(error.code, "san-nesting");
    assert.equal(error.limit, 32);
    assert.equal(error.actual, 33);
    return true;
  });
});

test("file RAV budgets pass at exact limits and fail at plus one", () => {
  const pgn = "1. e4 e5 (1... c5) *";
  assert.doesNotThrow(() => parsePgnCollection(pgn, {
    maxLines: 2,
    maxTotalPlies: 4,
    maxDepth: 2,
    maxNodes: 4,
    maxSanTokens: 5,
    maxSanNesting: 1,
  }));

  const expectedCode = (code: string) => (error: unknown) => {
    assert.ok(error instanceof InputLimitError);
    assert.equal(error.code, code);
    return true;
  };
  assert.throws(() => parsePgnCollection(pgn, { maxLines: 1 }), expectedCode("line-count"));
  assert.throws(() => parsePgnCollection(pgn, { maxTotalPlies: 3 }), expectedCode("total-plies"));
  assert.throws(() => parsePgnCollection(pgn, { maxDepth: 1 }), expectedCode("depth"));
  assert.throws(() => parsePgnCollection(pgn, { maxNodes: 3 }), expectedCode("node-count"));
  assert.throws(() => parsePgnCollection(pgn, { maxSanTokens: 4 }), expectedCode("san-token-count"));
  assert.throws(() => parsePgnCollection(pgn, { maxSanNesting: 0 }), expectedCode("san-nesting"));
});

test("prepared file moves preserve canonical coordinates and FEN transitions", () => {
  const quote = String.fromCharCode(34);
  const promotionFen = "7k/P7/8/8/8/8/5K2/8 w - - 0 1";
  const blackFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 7";
  const cases = [
    "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O *",
    "1. e4 a6 2. e5 d5 3. exd6 *",
    `[SetUp ${quote}1${quote}]\n[FEN ${quote}${promotionFen}${quote}]\n\n1. a8=N *`,
    `[SetUp ${quote}1${quote}]\n[FEN ${quote}${blackFen}${quote}]\n\n7... e5 8. Nf3 *`,
  ];

  for (const pgn of cases) {
    const parsed = parsePgnCollection(pgn);
    assert.equal(parsed.gameCount, 1);
    for (const prepared of parsed.preparedLines) assertPreparedMovesMatchChess(prepared);
    assert.deepEqual(buildTreeFromPreparedLines(parsed.preparedLines), processImportText(pgn, "pgn").tree);
  }

  const transposition = parsePgnCollection(
    "1. Nf3 (1. Nc3 Nc6 2. Nf3 Nf6) Nf6 2. Nc3 Nc6 *",
  );
  assert.equal(transposition.preparedLines.length, 2);
  assert.equal(
    transposition.preparedLines[0].moves.at(-1)?.afterFen,
    transposition.preparedLines[1].moves.at(-1)?.afterFen,
  );
});

test("prepared-tree validation rejects every inconsistent move field", () => {
  const original = parsePgnCollection("1. e4 e5 *").preparedLines;
  const mutations: Array<(lines: PreparedTreeLine[]) => void> = [
    (lines) => { lines[0].moves[0].from = "a1"; },
    (lines) => { lines[0].moves[0].to = "a8"; },
    (lines) => { lines[0].moves[0].promotion = "n"; },
    (lines) => { lines[0].moves[0].beforeFen = lines[0].moves[0].afterFen; },
    (lines) => { lines[0].moves[0].afterFen = lines[0].moves[0].beforeFen; },
    (lines) => { lines[0].moves[0].afterFen = "not a FEN"; },
    (lines) => {
      lines[0].line.moves[0] = "d4";
      lines[0].moves[0].san = "d4";
    },
  ];

  assert.doesNotThrow(() => buildTreeFromPreparedLines(original));
  for (const mutate of mutations) {
    const corrupted = structuredClone(original);
    mutate(corrupted);
    assert.throws(
      () => buildTreeFromPreparedLines(corrupted),
      /Invalid prepared move sequence/,
    );
  }
});

test("an imported zero-stat RAV is not presented as a manual line", () => {
  const parsed = parsePgnCollection(`[Opening "Sicilian"]
[Result "1-0"]

1. e4 e5 (1... c5) 1-0`);
  const tree = buildTreeFromPreparedLines(parsed.preparedLines);
  const variation = tree.children[0].children.find((node) => node.san === "c5");
  assert.ok(variation);
  assert.equal(gameCount(variation.results), 0);

  const markup = renderToStaticMarkup(React.createElement(PositionInspector, {
    node: variation,
    path: ["e4", "c5"],
    hasData: true,
    locale: "en",
    flipped: false,
    onFlip() {},
    onBack() {},
    onForward() {},
    onMove() { return false; },
    lightSquareColor: "#f0d9b5",
    darkSquareColor: "#6f8f72",
    editingDisabled: false,
  }));

  assert.match(markup, /Sicilian/);
  assert.doesNotMatch(markup, />Manual line</);
});

function assertPreparedMovesMatchChess(prepared: PreparedTreeLine) {
  const chess = new Chess(prepared.line.startFen);
  assert.equal(prepared.moves.length, prepared.line.moves.length);
  for (const [index, move] of prepared.moves.entries()) {
    const played = chess.move(prepared.line.moves[index]);
    assert.deepEqual(move, {
      san: played.san,
      from: played.from,
      to: played.to,
      promotion: played.promotion,
      beforeFen: played.before,
      afterFen: played.after,
    });
  }
}
