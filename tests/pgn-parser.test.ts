import assert from "node:assert/strict";
import test from "node:test";
import { parsePgnCollection } from "../features/explorer/services/pgnParser";
import { buildTree, popularityPercentage, resultCount } from "../features/explorer/services/treeBuilder";
import { DEFAULT_LOCALE, firstMovesLabel, gamesLabel, importSuccess, messages } from "../features/explorer/i18n";
import { playBoardMove } from "../features/explorer/services/boardMove";
import { Chess } from "chess.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "../features/explorer/settings";

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
