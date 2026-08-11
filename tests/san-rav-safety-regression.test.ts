import assert from "node:assert/strict";
import test from "node:test";
import { Chess, DEFAULT_POSITION } from "chess.js";
import type { InputLimitErrorCode } from "../features/explorer/services/inputLimits";
import { parsePgnCollection } from "../features/explorer/services/pgnParser";
import { validateSanSequence } from "../features/explorer/services/sanParser";

const BLACK_TO_MOVE_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 7";

test("only leading PGN headers can declare the SAN starting position", () => {
  const fakeHeadersInComment = `{ analysis copied from another game
[SetUp "1"]
[FEN "not a FEN"]
}
1. e4 e5`;
  const ignored = validateSanSequence(fakeHeadersInComment);
  assert.equal(ignored.valid, true);
  if (!ignored.valid) return;
  assert.equal(ignored.startFen, DEFAULT_POSITION);
  assert.deepEqual(ignored.moves, ["e4", "e5"]);

  const realHeaderWithFakeConflict = `[SetUp "1"]
[FEN "${BLACK_TO_MOVE_FEN}"]

{ unrelated embedded tags
[SetUp "0"]
[FEN "${DEFAULT_POSITION}"]
}
7. ... e5 8. Nf3 *`;
  const declared = validateSanSequence(realHeaderWithFakeConflict);
  assert.equal(declared.valid, true);
  if (!declared.valid) return;
  assert.equal(declared.startFen, new Chess(BLACK_TO_MOVE_FEN).fen());
  assert.deepEqual(declared.moves, ["e5", "Nf3"]);

  const conflictingRealHeaders = `[SetUp "1"]
[FEN "${BLACK_TO_MOVE_FEN}"]
[FEN "${DEFAULT_POSITION}"]

7... e5 *`;
  const conflict = validateSanSequence(conflictingRealHeaders);
  assert.equal(conflict.valid, false);
  if (conflict.valid) return;
  assert.equal(conflict.errorCode, "invalid-fen");
});

test("preserves nested and sibling RAV lines without replaying their prefixes", () => {
  const result = validateSanSequence(
    "1. e4 e5 (1... c5 2. Nf3 (2. Nc3) d6) (1... e6) 2. Nf3 Nc6 *",
  );

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.lines, [
    ["e4", "e5", "Nf3", "Nc6"],
    ["e4", "c5", "Nf3", "d6"],
    ["e4", "c5", "Nc3"],
    ["e4", "e6"],
  ]);
});

test("accepts standalone ellipsis tokens from black-to-move PGN", () => {
  const result = validateSanSequence(`[SetUp "1"]
[FEN "${BLACK_TO_MOVE_FEN}"]

7. ... e5 (7. ... c5) 8. Nf3 *`);

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.startFen, new Chess(BLACK_TO_MOVE_FEN).fen());
  assert.deepEqual(result.lines, [
    ["e5", "Nf3"],
    ["c5"],
  ]);
});

test("sibling RAV work is linear in played moves rather than prefix length", () => {
  const cycle = ["Nf3", "Nf6", "Ng1", "Ng8"];
  const mainLine = Array.from({ length: 500 }, (_, index) => cycle[index % cycle.length]);
  const pgn = `${mainLine.join(" ")} ${"(Nh5) ".repeat(90)}*`;
  const originalMove = Chess.prototype.move;
  let moveCalls = 0;
  let result: ReturnType<typeof validateSanSequence>;

  Chess.prototype.move = function (...args: Parameters<Chess["move"]>) {
    moveCalls += 1;
    return originalMove.apply(this, args);
  };
  try {
    result = validateSanSequence(pgn);
  } finally {
    Chess.prototype.move = originalMove;
  }

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.lines.length, 2);
  assert.equal(moveCalls, mainLine.length + 90);
});

test("file RAV expansion reports global line and ply limit codes", () => {
  const pgn = "1. e4 (1. d4) (1. c4) *";

  assert.throws(
    () => parsePgnCollection(pgn, { maxLines: 2 }),
    expectLimitCode("line-count"),
  );
  assert.throws(
    () => parsePgnCollection(pgn, { maxTotalPlies: 2 }),
    expectLimitCode("total-plies"),
  );
});

test("incremental SAN token limits preserve lexical rules and stop at limit plus one", () => {
  const annotated = `1.e4$1 ; ignored { spanning
; comment } still ignored
1...e5(1...c5$2)2.Nf3 *`;
  const exact = validateSanSequence(annotated, undefined, { maxSanTokens: 6 });
  assert.equal(exact.valid, true);
  if (exact.valid) {
    assert.deepEqual(exact.lines, [
      ["e4", "e5", "Nf3"],
      ["e4", "c5"],
    ]);
  }

  const plusOne = validateSanSequence(annotated, undefined, { maxSanTokens: 5 });
  assert.equal(plusOne.valid, false);
  if (!plusOne.valid) {
    assert.equal(plusOne.errorCode, "input-limit");
    assert.deepEqual(plusOne.inputLimit, {
      code: "san-token-count",
      limit: 5,
      actual: 6,
    });
  }

  const invalidSuffix = validateSanSequence(
    "1.e4 e5 2.Nf3 DefinitelyNotSan AnotherInvalidMove",
    undefined,
    { maxSanTokens: 2 },
  );
  assert.equal(invalidSuffix.valid, false);
  if (!invalidSuffix.valid) {
    assert.equal(invalidSuffix.errorCode, "input-limit");
    assert.deepEqual(invalidSuffix.inputLimit, {
      code: "san-token-count",
      limit: 2,
      actual: 3,
    });
  }
});

test("braces in separate semicolon comments cannot swallow intervening moves", () => {
  const pgn = `[Result "*"]

1. e4 ; comment {
1... e5 ; comment }
2. Nf3 Nc6 *`;

  const pasted = validateSanSequence(pgn);
  assert.equal(pasted.valid, true);
  if (!pasted.valid) return;
  assert.deepEqual(pasted.moves, ["e4", "e5", "Nf3", "Nc6"]);

  const imported = parsePgnCollection(pgn);
  assert.equal(imported.gameCount, 1);
  assert.equal(imported.skippedCount, 0);
  assert.deepEqual(imported.lines.map((line) => line.moves), pasted.lines);
});

test("semicolon-comment braces cannot hide nesting from the pre-chess limit", () => {
  const depth = 33;
  let rav = "";
  for (let index = 0; index < depth; index += 1) {
    rav += `( 1. ${index % 2 === 0 ? "c4" : "d4"} `;
  }
  const pgn = `1. e4 ; {\n${rav}${")".repeat(depth)}\n}\n*`;
  const originalLoadPgn = Chess.prototype.loadPgn;
  let loadPgnCalls = 0;

  Chess.prototype.loadPgn = function (...args: Parameters<Chess["loadPgn"]>) {
    loadPgnCalls += 1;
    return originalLoadPgn.apply(this, args);
  };
  try {
    assert.throws(() => parsePgnCollection(pgn), expectLimitCode("san-nesting"));
  } finally {
    Chess.prototype.loadPgn = originalLoadPgn;
  }
  assert.equal(loadPgnCalls, 0);
});

function expectLimitCode(expected: InputLimitErrorCode) {
  return (error: unknown) => {
    assert.equal((error as { code?: unknown }).code, expected);
    return true;
  };
}
