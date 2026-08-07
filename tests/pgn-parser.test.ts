import assert from "node:assert/strict";
import test from "node:test";
import { parsePgnCollection } from "../features/explorer/services/pgnParser";
import { buildTree, resultCount } from "../features/explorer/services/treeBuilder";

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
