import assert from "node:assert/strict";
import test from "node:test";
import {
  countPgnMainlineMoveTokens,
  parsePgnCollection,
} from "../features/explorer/services/pgnParser";
import {
  buildTree,
  buildTreeFromPreparedLines,
  popularityPercentage,
  resultCount,
} from "../features/explorer/services/treeBuilder";
import {
  DEFAULT_LOCALE,
  firstMovesLabel,
  gamesLabel,
  importErrorMessage,
  importSuccess,
  knownResultsLabel,
  messages,
} from "../features/explorer/i18n";
import { playBoardMove } from "../features/explorer/services/boardMove";
import { Chess } from "chess.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "../features/explorer/settings";
import {
  validateSanContexts,
  validateSanSequence,
} from "../features/explorer/services/sanParser";
import { fitTreeZoom, layoutTree, smartFitTreeZoom } from "../features/explorer/services/treeLayout";
import { createSanPasteState, sanPasteReducer } from "../features/explorer/services/sanPasteState";
import { acceptSanInput, insertSanInput } from "../features/explorer/services/sanInput";
import { formatBuildVersion } from "../features/explorer/services/buildVersion";
import { createManualLine, upsertManualLine } from "../features/explorer/services/manualLines";
import { appendManualMoveToTree } from "../features/explorer/services/manualTree";
import { createAnimationFrameScheduler } from "../features/explorer/services/viewportScheduler";
import { isExplorerDataMutationLocked } from "../features/explorer/services/explorerTaskLock";
import type { LineRecord } from "../features/explorer/types";
import {
  assertFileSizeWithinLimit,
  InputLimitError,
} from "../features/explorer/services/inputLimits";
import type { InputLimitErrorCode } from "../features/explorer/services/inputLimits";
import {
  monotonicProgress,
  processLineBuild,
  processImportText,
  processSanValidation,
} from "../features/explorer/services/importPipeline";
import {
  downloadBaseName,
  parseChessTreeJson,
  serializeChessTreeJson,
  serializeTreeToPgn,
  serializeTreeToSvg,
} from "../features/explorer/services/treeFiles";
import {
  gameCount,
  knownResultCount,
  LineIntegrityError,
  resultPercentages,
} from "../features/explorer/services/lineIntegrity";

const standardStartFen = new Chess().fen();
const blackToMoveFen = "8/8/8/8/8/8/5K2/7k b - - 0 37";
const alternateBlackToMoveFen = "8/8/8/8/8/8/4K3/7k b - - 0 37";
const initialBoardBlackToMoveFen =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 7";

const expectIntegrityCode = (code: "mixed-start-fen" | "unsafe-integer") =>
  (error: unknown) => {
    assert.ok(error instanceof LineIntegrityError);
    assert.equal(error.code, code);
    return true;
  };

const expectInputLimitCode = (code: InputLimitErrorCode) =>
  (error: unknown) => {
    assert.ok(error instanceof InputLimitError);
    assert.equal(error.code, code);
    return true;
  };

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
  assert.equal(knownResultsLabel("en", 1), "W/D/L from 1 known result");
  assert.equal(knownResultsLabel("el", 2), "W/D/L από 2 γνωστά αποτελέσματα");
});

test("uses English as the default interface language", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(messages[DEFAULT_LOCALE].settings, "Settings");
});

test("builds a manual branch without game statistics", () => {
  const tree = buildTree([
    {
      moves: ["e4", "c5", "Nf3"],
      startFen: standardStartFen,
      opening: "__manual__",
      results: { white: 0, draw: 0, black: 0, unknown: 0 },
    },
  ]);

  assert.equal(tree.children[0].san, "e4");
  assert.equal(tree.children[0].children[0].san, "c5");
  assert.equal(tree.children[0].children[0].children[0].san, "Nf3");
  assert.equal(resultCount(tree.results), 0);
  assert.equal(popularityPercentage(tree.children[0].results, resultCount(tree.results)), null);
});

test("shows popularity only when PGN statistics exist", () => {
  assert.equal(popularityPercentage({ white: 3, draw: 1, black: 1, unknown: 0 }, 10), 50);
  assert.equal(popularityPercentage({ white: 0, draw: 0, black: 0, unknown: 0 }, 10), null);
  assert.equal(popularityPercentage({ white: 1, draw: 0, black: 0, unknown: 0 }, 0), null);
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

test("uses the compact serif appearance as the default", () => {
  assert.deepEqual(DEFAULT_SETTINGS, {
    accentColor: "#173f32",
    lightSquareColor: "#f0d9b5",
    darkSquareColor: "#6f8f72",
    textSize: "small",
    boardSize: "compact",
    font: "serif",
    treeDirection: "right",
  });
});

test("parses multiple PGN games and preserves results", () => {
  const parsed = parsePgnCollection(collection);

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines[0].moves, ["c4", "Nf6", "Nc3", "e5"]);
  assert.deepEqual(parsed.lines[1].results, { white: 0, draw: 0, black: 1, unknown: 0 });
});

test("treats prototype-like opening names as ordinary data", () => {
  const parsed = parsePgnCollection(`[Opening "__proto__"]
[Result "*"]

1. e4 *`);

  assert.doesNotThrow(() => buildTree(parsed.lines));
  assert.equal(buildTree(parsed.lines).openingTotals.__proto__, 1);
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
      startFen: standardStartFen,
      opening: "__manual__",
      results: { white: 0, draw: 0, black: 0, unknown: 0 },
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

test("keeps data mutations locked across async import render boundaries", () => {
  assert.equal(isExplorerDataMutationLocked(false, null), false);
  assert.equal(isExplorerDataMutationLocked(false, "file"), true);
  assert.equal(isExplorerDataMutationLocked(false, "tree"), true);
  assert.equal(isExplorerDataMutationLocked(true, null), true);
});

test("localizes an unavailable background worker without suggesting a synchronous import", () => {
  assert.match(importErrorMessage("en", { code: "worker-unavailable" }), /background processing/);
  assert.match(importErrorMessage("el", { code: "worker-unavailable" }), /παρασκήνιο/);
});

test("lays out a custom-FEN tree from the viewport origin, independent of fullmove number", () => {
  const tree = buildTree([{
    startFen: initialBoardBlackToMoveFen,
    moves: ["c5"],
    opening: "Custom start",
    results: { white: 0, draw: 0, black: 0, unknown: 1 },
  }]);
  const right = layoutTree(tree, new Set(), "right");
  const down = layoutTree(tree, new Set(), "down");
  const rightRoot = right.nodes.find((node) => node.id === "start")!;
  const rightChild = right.nodes.find((node) => node.parentId === "start")!;
  const downRoot = down.nodes.find((node) => node.id === "start")!;
  const downChild = down.nodes.find((node) => node.parentId === "start")!;

  assert.equal(rightRoot.x, 54);
  assert.equal(rightChild.x - rightRoot.x, 82);
  assert.equal(downRoot.y, 48);
  assert.equal(downChild.y - downRoot.y, 70);
});

test("fits the complete tree inside the available viewport", () => {
  assert.equal(fitTreeZoom(2000, 1000, 1000, 600), 0.472);
  assert.equal(fitTreeZoom(400, 300, 1000, 700), 1);
  assert.equal(smartFitTreeZoom(2000, 1000, 1000, 600), 0.67);
  assert.equal(smartFitTreeZoom(400, 300, 1000, 700), 1);
});

test("clears validated SAN when clipboard content is replaced with empty text", () => {
  const valid = validateSanSequence("e4");
  let state = createSanPasteState();
  state = sanPasteReducer(state, { type: "edit", value: "e4" });
  state = sanPasteReducer(state, { type: "validation-started", requestId: 1, value: "e4" });
  state = sanPasteReducer(state, {
    type: "validated",
    requestId: 1,
    value: "e4",
    fromStart: valid,
    fromSelected: valid,
  });
  state = sanPasteReducer(state, { type: "replace", value: "" });

  assert.equal(state.value, "");
  assert.equal(state.fromStart, null);
  assert.equal(state.fromSelected, null);
});

test("keeps stale SAN worker results out and progress monotonic", () => {
  const e4 = validateSanSequence("e4");
  let state = createSanPasteState();
  state = sanPasteReducer(state, { type: "edit", value: "e4" });
  state = sanPasteReducer(state, { type: "validation-started", requestId: 7, value: "e4" });
  state = sanPasteReducer(state, { type: "validation-progress", requestId: 7, percent: 60 });
  state = sanPasteReducer(state, { type: "validation-progress", requestId: 7, percent: 20 });
  assert.equal(state.validationProgress, 60);

  state = sanPasteReducer(state, { type: "edit", value: "d4" });
  const staleState = state;
  state = sanPasteReducer(state, {
    type: "validated",
    requestId: 7,
    value: "e4",
    fromStart: e4,
    fromSelected: e4,
  });
  assert.equal(state, staleState);
  assert.equal(state.checkedValue, "");
  assert.equal(state.validationStatus, "scheduled");
});

test("rejects oversized SAN before retaining it in controlled input state", () => {
  const exact = acceptSanInput("12345", 5);
  assert.deepEqual(exact, { accepted: true, value: "12345" });

  const oversized = acceptSanInput("123456", 5);
  assert.equal(oversized.accepted, false);
  assert.equal("value" in oversized, false);
  if (!oversized.accepted) {
    assert.deepEqual(oversized.error, { code: "san-length", limit: 5, actual: 6 });
  }

  const insertion = insertSanInput("e4 e5", " Nf3", 5, 5, 8);
  assert.equal(insertion.accepted, false);
  if (!insertion.accepted) assert.equal(insertion.error.actual, 9);

  let state = sanPasteReducer(createSanPasteState(), { type: "edit", value: "e4" });
  if (!oversized.accepted) {
    state = sanPasteReducer(state, { type: "input-rejected", error: oversized.error });
  }
  assert.equal(state.value, "e4");
  assert.equal(state.inputLimit?.actual, 6);
});

test("marks uncommitted builds as dirty", () => {
  const clean = formatBuildVersion(new Date("2026-08-10T15:46:00Z"), "abcdef0", false);
  const dirty = formatBuildVersion(new Date("2026-08-10T15:46:00Z"), "abcdef0", true);

  assert.equal(clean, "version_20260810_1846_commit_abcdef0");
  assert.equal(dirty, "version_20260810_1846_commit_abcdef0_dirty");
});

test("coalesces viewport work to one animation frame and cancels pending work", () => {
  let queued: FrameRequestCallback | undefined;
  let requestCount = 0;
  let cancelCount = 0;
  let updateCount = 0;
  const scheduler = createAnimationFrameScheduler(
    () => { updateCount += 1; },
    (callback) => {
      requestCount += 1;
      queued = callback;
      return requestCount;
    },
    () => { cancelCount += 1; },
  );

  scheduler.schedule();
  scheduler.schedule();
  assert.equal(requestCount, 1);
  queued?.(0);
  assert.equal(updateCount, 1);

  scheduler.schedule();
  assert.equal(requestCount, 2);
  scheduler.cancel();
  assert.equal(cancelCount, 1);
});

test("keeps sequential manual play as one line instead of every prefix", () => {
  let lines: LineRecord[] = [];
  for (let depth = 1; depth <= 100; depth += 1) {
    const moves = Array.from({ length: depth }, (_, index) => `move-${index + 1}`);
    lines = upsertManualLine(lines, moves, standardStartFen);
  }

  assert.equal(lines.length, 1);
  assert.equal(lines[0].moves.length, 100);

  const statistical: LineRecord = {
    startFen: standardStartFen,
    moves: ["e4"],
    opening: "Imported",
    results: { white: 1, draw: 0, black: 0, unknown: 0 },
  };
  const withImported = upsertManualLine([statistical], ["e4", "e5"], standardStartFen);
  assert.equal(withImported.length, 2);
  assert.equal(withImported[0], statistical);
});

test("appends a board move by cloning only its ancestor path without replay", () => {
  const tree = buildTree([
    createManualLine(["e4"], standardStartFen),
    createManualLine(["d4"], standardStartFen),
  ]);
  const e4 = tree.children.find((node) => node.san === "e4")!;
  const d4 = tree.children.find((node) => node.san === "d4")!;
  const played = playBoardMove(e4.fen, "e7", "e5")!;
  const updated = appendManualMoveToTree(tree, e4.id, played);
  const updatedE4 = updated.children.find((node) => node.san === "e4")!;

  assert.notEqual(updated, tree);
  assert.notEqual(updatedE4, e4);
  assert.equal(updated.children.find((node) => node.san === "d4"), d4);
  assert.equal(e4.children.length, 0);
  assert.equal(updatedE4.children[0].san, "e5");
  assert.equal(updatedE4.children[0].fen, played.fen);
  assert.deepEqual(updatedE4.children[0].openingTotals, { __manual__: 0 });
});

test("enforces file, line, ply, depth, and node budgets at their boundaries", () => {
  assert.doesNotThrow(() => assertFileSizeWithinLimit(8, { maxFileBytes: 8 }));
  assert.throws(
    () => assertFileSizeWithinLimit(9, { maxFileBytes: 8 }),
    expectInputLimitCode("file-size"),
  );

  const line = createManualLine(["e4", "e5"], standardStartFen);
  assert.doesNotThrow(() => buildTree([line], {
    maxLines: 1,
    maxTotalPlies: 2,
    maxDepth: 2,
    maxNodes: 3,
  }));
  assert.throws(() => buildTree([line], { maxLines: 0 }), expectInputLimitCode("line-count"));
  assert.throws(() => buildTree([line], { maxTotalPlies: 1 }), expectInputLimitCode("total-plies"));
  assert.throws(() => buildTree([line], { maxDepth: 1 }), expectInputLimitCode("depth"));
  assert.throws(() => buildTree([line], { maxNodes: 2 }), expectInputLimitCode("node-count"));
});

test("counts repeated input plies even when games share the same tree nodes", () => {
  const line = createManualLine(["e4", "e5"], standardStartFen);
  const tree = buildTree([line, line], { maxTotalPlies: 4, maxNodes: 3 });

  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].children.length, 1);
  assert.throws(
    () => buildTree([line, line], { maxTotalPlies: 3, maxNodes: 3 }),
    expectInputLimitCode("total-plies"),
  );
});

test("budgets all encountered PGN games and validates prepared trees", () => {
  const twoGames = `1. e4 1-0

1. d4 0-1`;
  const parsed = parsePgnCollection(twoGames, {
    maxGames: 2,
    maxLines: 2,
    maxTotalPlies: 2,
    maxDepth: 1,
  });

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.preparedLines.length, 2);
  assert.deepEqual(buildTreeFromPreparedLines(parsed.preparedLines), buildTree(parsed.lines));
  assert.throws(
    () => parsePgnCollection(twoGames, { maxGames: 1 }),
    expectInputLimitCode("game-count"),
  );
  assert.throws(
    () => parsePgnCollection(twoGames, { maxLines: 1 }),
    expectInputLimitCode("line-count"),
  );
  assert.throws(
    () => parsePgnCollection(twoGames, { maxTotalPlies: 1 }),
    expectInputLimitCode("total-plies"),
  );
  assert.throws(
    () => parsePgnCollection(twoGames, { maxNodes: 2 }),
    expectInputLimitCode("node-count"),
  );

  const invalidThenValid = `1. NotAMove 1-0

1. e4 1-0`;
  assert.throws(
    () => parsePgnCollection(invalidThenValid, { maxGames: 1 }),
    expectInputLimitCode("game-count"),
  );
  assert.doesNotThrow(() => parsePgnCollection("1. e4 *", { maxPgnBlockBytes: 7 }));
  assert.throws(
    () => parsePgnCollection("1. e4 *", { maxPgnBlockBytes: 6 }),
    expectInputLimitCode("pgn-block-size"),
  );

  const annotated = `[Result "*"]

1. e4 (1. d4 d5 (1... Nf6)) {Nf3 is mentioned here} e5
2. Nf3 $1 ; Nc6 is only a comment
*`;
  assert.equal(countPgnMainlineMoveTokens(annotated), 3);
  assert.throws(
    () => parsePgnCollection("1. NotAMove AnotherBadToken ThirdBadToken *", { maxDepth: 2 }),
    expectInputLimitCode("depth"),
  );
});

test("bounds SAN text, tokens, nesting, lines, output plies, and depth", () => {
  const san = "1. e4 e5 (1... c5)";
  const exact = validateSanSequence(san, undefined, {
    maxSanCharacters: san.length,
    maxSanTokens: 5,
    maxSanNesting: 1,
    maxSanOutputLines: 2,
    maxSanOutputPlies: 4,
    maxLines: 2,
    maxTotalPlies: 4,
    maxDepth: 2,
    maxNodes: 4,
  });
  assert.equal(exact.valid, true);

  const expectSanLimit = (result: ReturnType<typeof validateSanSequence>, code: InputLimitErrorCode) => {
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.errorCode, "input-limit");
      assert.equal(result.inputLimit?.code, code);
    }
  };
  expectSanLimit(validateSanSequence(san, undefined, { maxSanCharacters: san.length - 1 }), "san-length");
  expectSanLimit(validateSanSequence(san, undefined, { maxSanTokens: 4 }), "san-token-count");
  expectSanLimit(validateSanSequence(san, undefined, { maxSanNesting: 0 }), "san-nesting");
  expectSanLimit(validateSanSequence(san, undefined, { maxSanOutputLines: 1 }), "san-output-lines");
  expectSanLimit(validateSanSequence(san, undefined, { maxSanOutputPlies: 3 }), "san-output-plies");
  expectSanLimit(validateSanSequence(san, undefined, { maxLines: 1 }), "line-count");
  expectSanLimit(validateSanSequence(san, undefined, { maxTotalPlies: 3 }), "total-plies");
  expectSanLimit(validateSanSequence(san, undefined, { maxDepth: 1 }), "depth");
  expectSanLimit(validateSanSequence(san, undefined, { maxNodes: 3 }), "node-count");
});

test("shares same-position SAN validation and returns the parser's final FEN", () => {
  const contexts = validateSanContexts("1. e4 e5 2. Nf3", standardStartFen);
  assert.equal(contexts.fromSelected, contexts.fromStart);
  assert.equal(contexts.fromStart.valid, true);

  if (contexts.fromStart.valid) {
    const expected = new Chess();
    expected.move("e4");
    expected.move("e5");
    expected.move("Nf3");
    assert.equal(contexts.fromStart.finalFen, expected.fen());
  }

  const customPgn = `[SetUp "1"]
[FEN "${blackToMoveFen}"]

37... Kh2 38. Kf3`;
  const customContexts = validateSanContexts(customPgn, blackToMoveFen);
  assert.equal(customContexts.fromSelected, customContexts.fromStart);

  const mismatch = validateSanContexts(customPgn, standardStartFen);
  assert.equal(mismatch.fromSelected.valid, false);
  if (!mismatch.fromSelected.valid) {
    assert.equal(mismatch.fromSelected.errorCode, "start-position-mismatch");
  }
});

test("processes SAN validation through one worker payload with monotonic progress", () => {
  const progress: Array<{ percent: number; stage: string }> = [];
  const payload = processSanValidation(
    "1. e4 e5",
    standardStartFen,
    (next) => progress.push(next),
  );

  assert.deepEqual(progress, [
    { percent: 10, stage: "validating" },
    { percent: 100, stage: "validating" },
  ]);
  assert.equal(payload.fromStart.valid, true);
  assert.equal(payload.fromSelected, payload.fromStart);
});

test("validates JSON in one authoritative worker replay and preserves atomic payloads", () => {
  const invalidLine = createManualLine(["e5"], standardStartFen);
  const content = JSON.stringify({
    format: "chesstree",
    version: 1,
    sourceFileName: null,
    lines: [invalidLine],
    settings: DEFAULT_SETTINGS,
  });

  assert.throws(() => parseChessTreeJson(content));
  assert.equal(parseChessTreeJson(content, { deferMoveValidation: true }).lines.length, 1);
  assert.throws(() => processImportText(content, "json"), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "invalid-tree-file");
    return true;
  });

  const progress: number[] = [];
  const payload = processImportText(collection, "pgn", ({ percent }) => progress.push(percent));
  assert.deepEqual(progress, [25, 72, 100]);
  assert.equal(payload.lines.length, 2);
  assert.equal(payload.tree.children[0].san, "c4");

  const monotonic: number[] = [];
  const report = monotonicProgress(({ percent }) => monotonic.push(percent));
  report({ percent: 50, stage: "parsing" });
  report({ percent: 20, stage: "reading" });
  report({ percent: 120, stage: "building" });
  assert.deepEqual(monotonic, [50, 50, 100]);

  const buildProgress: number[] = [];
  const rebuilt = processLineBuild(
    [createManualLine(["e4", "e5"], standardStartFen)],
    ({ percent }) => buildProgress.push(percent),
  );
  assert.deepEqual(buildProgress, [15, 100]);
  assert.equal(rebuilt.tree.children[0].children[0].san, "e5");
});

test("localizes typed resource-limit errors with the configured limit", () => {
  assert.match(
    importErrorMessage("en", { code: "node-count", limit: 5, actual: 6 }),
    /5-node limit/,
  );
  assert.match(
    importErrorMessage("el", { code: "san-nesting", limit: 32, actual: 33 }),
    /32/,
  );
});

test("parses and builds a PGN that starts from a custom FEN", () => {
  const pgn = `[Event "Custom endgame"]
[SetUp "1"]
[FEN "${blackToMoveFen}"]
[Result "*"]

37... Kh2 38. Kf3 *`;
  const parsed = parsePgnCollection(pgn);

  assert.equal(parsed.gameCount, 1);
  assert.equal(parsed.skippedCount, 0);
  assert.equal(parsed.lines[0].startFen, blackToMoveFen);
  assert.deepEqual(parsed.lines[0].moves, ["Kh2", "Kf3"]);
  assert.deepEqual(parsed.lines[0].results, { white: 0, draw: 0, black: 0, unknown: 1 });

  const tree = buildTree(parsed.lines);
  assert.equal(tree.fen, blackToMoveFen);
  assert.equal(tree.children[0].san, "Kh2");
  assert.equal(tree.children[0].children[0].san, "Kf3");
  assert.equal(resultCount(tree.results), 1);
});

test("exports a black-to-move custom FEN with its absolute move numbers", () => {
  const parsed = parsePgnCollection(`[Event "Custom endgame"]
[SetUp "1"]
[FEN "${blackToMoveFen}"]
[Result "*"]

37... Kh2 38. Kf3 *`);
  const exported = serializeTreeToPgn(buildTree(parsed.lines));

  assert.match(exported, /^\[SetUp "1"\]$/m);
  assert.ok(exported.includes(`[FEN "${blackToMoveFen}"]`));
  assert.match(exported, /37\.\.\. Kh2/);
  assert.match(exported, /38\. Kf3/);
  assert.doesNotThrow(() => new Chess().loadPgn(exported, { strict: false }));

  const reparsed = parsePgnCollection(exported);
  assert.equal(reparsed.lines[0].startFen, blackToMoveFen);
  assert.deepEqual(reparsed.lines[0].moves, ["Kh2", "Kf3"]);
});

test("omits SetUp and FEN headers for a standard-start export", () => {
  const exported = serializeTreeToPgn(buildTree(parsePgnCollection(collection).lines));

  assert.doesNotMatch(exported, /^\[SetUp /m);
  assert.doesNotMatch(exported, /^\[FEN /m);
  assert.doesNotThrow(() => new Chess().loadPgn(exported, { strict: false }));
});

test("round-trips start FEN and unknown results in the current JSON format", () => {
  const lines = parsePgnCollection(`[Event "Custom JSON"]
[SetUp "1"]
[FEN "${blackToMoveFen}"]
[Result "*"]

37... Kh2 38. Kf3 *`).lines;
  const json = serializeChessTreeJson(lines, DEFAULT_SETTINGS, "custom.pgn");
  const restored = parseChessTreeJson(json);

  assert.match(json, /"startFen"/);
  assert.match(json, /"unknown": 1/);
  assert.deepEqual(restored.lines, lines);
});

test("loads legacy JSON without startFen or unknown fields", () => {
  const current = JSON.parse(serializeChessTreeJson(
    [{
      startFen: standardStartFen,
      moves: ["e4", "e5"],
      opening: "Legacy line",
      results: { white: 1, draw: 0, black: 0, unknown: 0 },
    }],
    DEFAULT_SETTINGS,
    "legacy.pgn",
  )) as { lines: Array<Record<string, unknown>> };
  delete current.lines[0].startFen;
  const legacyResults = current.lines[0].results as Record<string, unknown>;
  delete legacyResults.unknown;

  const restored = parseChessTreeJson(JSON.stringify(current));
  assert.equal(restored.lines[0].startFen, standardStartFen);
  assert.deepEqual(restored.lines[0].results, { white: 1, draw: 0, black: 0, unknown: 0 });
});

test("reads a pasted FEN PGN and preserves recursive variations", () => {
  const pastedPgn = `[Event "Black alternatives"]
[SetUp "1"]
[FEN "${initialBoardBlackToMoveFen}"]
[Result "*"]

7... c5 (7... e5 8. Nf3 (8. Nc3) Nc6) 8. Nf3 d6 *`;
  const result = validateSanSequence(pastedPgn);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.startFen, initialBoardBlackToMoveFen);
    assert.deepEqual(result.moves, ["c5", "Nf3", "d6"]);
    assert.deepEqual(result.lines, [
      ["c5", "Nf3", "d6"],
      ["e5", "Nf3", "Nc6"],
      ["e5", "Nc3"],
    ]);

    const tree = buildTree(result.lines.map((moves) => ({
      startFen: result.startFen,
      moves,
      opening: "__manual__",
      results: { white: 0, draw: 0, black: 0, unknown: 0 },
    })));
    assert.equal(tree.fen, initialBoardBlackToMoveFen);
    assert.deepEqual(tree.children.map((node) => node.san), ["c5", "e5"]);
  }
});

test("rejects a pasted FEN that differs from the selected position", () => {
  const pastedPgn = `[SetUp "1"]
[FEN "${initialBoardBlackToMoveFen}"]
[Result "*"]

7... c5 *`;
  const result = validateSanSequence(pastedPgn, standardStartFen);

  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.errorCode, "start-position-mismatch");
});

test("rejects pasted FEN move numbers that would overflow the tree ply", () => {
  const result = validateSanSequence(`[SetUp "1"]
[FEN "8/8/8/8/8/8/5K2/7k b - - 0 4503599627370495"]

Kh2 Kf3 Kh3`);

  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.errorCode, "unsafe-integer");
});

test("accepts games with the same normalized start and rejects mixed starts", () => {
  const sameStart = `[Event "First"]
[SetUp "1"]
[FEN "${blackToMoveFen}"]
[Result "1-0"]

37... Kh2 38. Kf3 1-0

[Event "Second"]
[SetUp "1"]
[FEN "${blackToMoveFen}"]
[Result "1/2-1/2"]

37... Kh2 38. Kf3 1/2-1/2`;
  const parsed = parsePgnCollection(sameStart);

  assert.equal(parsed.gameCount, 2);
  assert.equal(buildTree(parsed.lines).fen, blackToMoveFen);

  const mixedStarts = `${sameStart}

[Event "Different start"]
[SetUp "1"]
[FEN "${alternateBlackToMoveFen}"]
[Result "*"]

37... Kh2 38. Kf3 *`;
  assert.throws(() => parsePgnCollection(mixedStarts), expectIntegrityCode("mixed-start-fen"));
  assert.throws(
    () => buildTree([
      parsed.lines[0],
      { ...parsed.lines[1], startFen: alternateBlackToMoveFen },
    ]),
    expectIntegrityCode("mixed-start-fen"),
  );
});

test("splits a PGN collection without Event headers", () => {
  const noEventHeaders = `[Site "First"]
[Result "1-0"]

1. e4 e5 1-0

[Site "Second"]
[Result "0-1"]

1. d4 d5 0-1`;
  const parsed = parsePgnCollection(noEventHeaders);

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines.map((line) => line.moves), [["e4", "e5"], ["d4", "d5"]]);
});

test("splits headerless games at top-level result markers", () => {
  const parsed = parsePgnCollection(`1. e4 e5 1-0
1. d4 d5 0-1`);

  assert.equal(parsed.gameCount, 2);
  assert.equal(parsed.skippedCount, 0);
  assert.deepEqual(parsed.lines.map((line) => line.moves), [["e4", "e5"], ["d4", "d5"]]);
  assert.deepEqual(parsed.lines.map((line) => line.results), [
    { white: 1, draw: 0, black: 0, unknown: 0 },
    { white: 0, draw: 0, black: 1, unknown: 0 },
  ]);
});

test("counts only the exact draw marker as a draw", () => {
  const exactDraw = parsePgnCollection(`[Event "Draw"]
[Result "1/2-1/2"]

1. e4 e5 1/2-1/2`).lines[0].results;
  const ongoing = parsePgnCollection(`[Event "Ongoing"]
[Result "*"]

1. d4 d5 *`).lines[0].results;
  const missing = parsePgnCollection(`[Event "Missing"]

1. Nf3 d5`).lines[0].results;
  const unrecognized = parsePgnCollection(`[Event "Abandoned"]
[Result "abandoned"]

1. c4 e5`).lines[0].results;

  assert.deepEqual(exactDraw, { white: 0, draw: 1, black: 0, unknown: 0 });
  assert.deepEqual(ongoing, { white: 0, draw: 0, black: 0, unknown: 1 });
  assert.deepEqual(missing, { white: 0, draw: 0, black: 0, unknown: 1 });
  assert.deepEqual(unrecognized, { white: 0, draw: 0, black: 0, unknown: 1 });
});

test("separates game counts from known-result percentages", () => {
  const results = { white: 101, draw: 99, black: 0, unknown: 200 };

  assert.equal(gameCount(results), 400);
  assert.equal(resultCount(results), 400);
  assert.equal(knownResultCount(results), 200);
  assert.deepEqual(resultPercentages(results), { white: 51, draw: 49, black: 0 });
  assert.deepEqual(
    resultPercentages({ white: 0, draw: 0, black: 0, unknown: 10 }),
    { white: 0, draw: 0, black: 0 },
  );
  assert.equal(popularityPercentage({ white: 0, draw: 0, black: 0, unknown: 1 }, 2), 50);
});

test("rejects a single line whose result total exceeds the safe-integer range", () => {
  const lines = [{
    startFen: standardStartFen,
    moves: ["e4"],
    opening: "Overflow",
    results: {
      white: Number.MAX_SAFE_INTEGER,
      draw: 1,
      black: 0,
      unknown: 0,
    },
  }];
  const json = JSON.stringify({
    format: "chesstree",
    version: 1,
    sourceFileName: "overflow.pgn",
    lines,
    settings: DEFAULT_SETTINGS,
  });

  assert.throws(
    () => serializeChessTreeJson(lines, DEFAULT_SETTINGS, "overflow.pgn"),
    expectIntegrityCode("unsafe-integer"),
  );
  assert.throws(() => parseChessTreeJson(json), expectIntegrityCode("unsafe-integer"));
  assert.throws(() => buildTree(lines), expectIntegrityCode("unsafe-integer"));
});

test("rejects safe line counters whose cross-line aggregate overflows", () => {
  const lines = [
    {
      startFen: standardStartFen,
      moves: ["e4"],
      opening: "First",
      results: {
        white: Number.MAX_SAFE_INTEGER,
        draw: 0,
        black: 0,
        unknown: 0,
      },
    },
    {
      startFen: standardStartFen,
      moves: ["d4"],
      opening: "Second",
      results: { white: 1, draw: 0, black: 0, unknown: 0 },
    },
  ];
  const json = JSON.stringify({
    format: "chesstree",
    version: 1,
    sourceFileName: "aggregate-overflow.pgn",
    lines,
    settings: DEFAULT_SETTINGS,
  });

  assert.throws(
    () => serializeChessTreeJson(lines, DEFAULT_SETTINGS, "aggregate-overflow.pgn"),
    expectIntegrityCode("unsafe-integer"),
  );
  assert.throws(() => parseChessTreeJson(json), expectIntegrityCode("unsafe-integer"));
  assert.throws(() => buildTree(lines), expectIntegrityCode("unsafe-integer"));
});

test("rejects cross-line totals that overflow across different result buckets", () => {
  const lines = [
    {
      startFen: standardStartFen,
      moves: ["e4"],
      opening: "White total",
      results: {
        white: Number.MAX_SAFE_INTEGER,
        draw: 0,
        black: 0,
        unknown: 0,
      },
    },
    {
      startFen: standardStartFen,
      moves: ["d4"],
      opening: "Draw total",
      results: { white: 0, draw: 1, black: 0, unknown: 0 },
    },
  ];

  assert.throws(
    () => serializeChessTreeJson(lines, DEFAULT_SETTINGS, "cross-bucket-overflow.pgn"),
    expectIntegrityCode("unsafe-integer"),
  );
  assert.throws(() => buildTree(lines), expectIntegrityCode("unsafe-integer"));
});
