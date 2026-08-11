import type { LineRecord } from "../types";

const MANUAL_OPENING = "__manual__";

export function createManualLine(moves: readonly string[], startFen: string): LineRecord {
  return {
    moves: [...moves],
    opening: MANUAL_OPENING,
    results: { white: 0, draw: 0, black: 0, unknown: 0 },
    startFen,
  };
}

/**
 * Adds a manual line without retaining every intermediate prefix created while
 * a user plays forward on the board. Statistical/imported lines are never
 * modified, and sibling manual variations remain separate lines.
 */
export function upsertManualLine(
  lines: readonly LineRecord[],
  moves: readonly string[],
  startFen: string,
) {
  const nextLine = createManualLine(moves, startFen);
  const exactOrLonger = lines.some(
    (line) =>
      isZeroStatisticManualLine(line) &&
      line.startFen === startFen &&
      isMovePrefix(nextLine.moves, line.moves),
  );
  if (exactOrLonger) return [...lines];

  let insertAt = lines.length;
  const retained = lines.filter((line, index) => {
    const replaceable =
      isZeroStatisticManualLine(line) &&
      line.startFen === startFen &&
      isMovePrefix(line.moves, nextLine.moves);
    if (replaceable) insertAt = Math.min(insertAt, index);
    return !replaceable;
  });

  retained.splice(Math.min(insertAt, retained.length), 0, nextLine);
  return retained;
}

export function upsertManualLines(
  lines: readonly LineRecord[],
  moveLines: readonly (readonly string[])[],
  startFen: string,
) {
  return moveLines.reduce<LineRecord[]>(
    (current, moves) => upsertManualLine(current, moves, startFen),
    [...lines],
  );
}

export function isZeroStatisticManualLine(line: LineRecord) {
  return (
    line.opening === MANUAL_OPENING &&
    line.results.white === 0 &&
    line.results.draw === 0 &&
    line.results.black === 0 &&
    line.results.unknown === 0
  );
}

function isMovePrefix(prefix: readonly string[], moves: readonly string[]) {
  return prefix.length <= moves.length && prefix.every((move, index) => move === moves[index]);
}
