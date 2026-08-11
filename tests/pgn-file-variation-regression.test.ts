import assert from "node:assert/strict";
import test from "node:test";
import { parsePgnCollection } from "../features/explorer/services/pgnParser";
import { buildTreeFromPreparedLines, gameCount } from "../features/explorer/services/treeBuilder";

test("file PGN import preserves recursive variations without inflating game totals", () => {
  const pgn = `[Event "Variation regression"]
[Result "1-0"]
[Opening "Open Game"]

1. e4 e5 (1... c5 2. Nf3 (2. Nc3) d6) 2. Nf3 Nc6 1-0`;

  const parsed = parsePgnCollection(pgn);

  assert.equal(parsed.gameCount, 1);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines.map((line) => line.moves), [
    ["e4", "e5", "Nf3", "Nc6"],
    ["e4", "c5", "Nf3", "d6"],
    ["e4", "c5", "Nc3"],
  ]);
  assert.deepEqual(parsed.lines[0].results, { white: 1, draw: 0, black: 0, unknown: 0 });
  assert.deepEqual(parsed.lines[1].results, { white: 0, draw: 0, black: 0, unknown: 0 });
  assert.deepEqual(parsed.lines[2].results, { white: 0, draw: 0, black: 0, unknown: 0 });

  const tree = buildTreeFromPreparedLines(parsed.preparedLines);
  assert.equal(gameCount(tree.results), 1);
  const e4 = tree.children.find((node) => node.san === "e4");
  assert.ok(e4);
  assert.deepEqual(e4.children.map((node) => node.san), ["e5", "c5"]);
  const c5 = e4.children.find((node) => node.san === "c5");
  assert.ok(c5);
  assert.deepEqual(c5.children.map((node) => node.san), ["Nf3", "Nc3"]);
});

test("file PGN variations retain a declared custom FEN", () => {
  const pgn = `[SetUp "1"]
[FEN "8/8/8/8/8/8/5K2/7k b - - 0 37"]
[Result "*"]

37... Kh2 (37... Kh1) 38. Kf3 *`;

  const parsed = parsePgnCollection(pgn);

  assert.equal(parsed.gameCount, 1);
  assert.equal(parsed.skippedCount, 0);
  assert.equal(parsed.lines.length, 2);
  assert.equal(parsed.lines[0].startFen, parsed.lines[1].startFen);
  assert.deepEqual(parsed.lines.map((line) => line.moves), [
    ["Kh2", "Kf3"],
    ["Kh1"],
  ]);
});
