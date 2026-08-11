import { DEFAULT_INPUT_LIMITS } from "./inputLimits";

export type SanInputLimitDetails = {
  code: "san-length";
  limit: number;
  actual: number;
};

export type SanInputResult =
  | { accepted: true; value: string }
  | { accepted: false; error: SanInputLimitDetails };

export function acceptSanInput(
  value: string,
  limit = DEFAULT_INPUT_LIMITS.maxSanCharacters,
): SanInputResult {
  return value.length <= limit
    ? { accepted: true, value }
    : { accepted: false, error: { code: "san-length", limit, actual: value.length } };
}

export function insertSanInput(
  currentValue: string,
  insertedValue: string,
  selectionStart: number,
  selectionEnd: number,
  limit = DEFAULT_INPUT_LIMITS.maxSanCharacters,
): SanInputResult {
  const start = clampSelection(selectionStart, currentValue.length);
  const end = Math.max(start, clampSelection(selectionEnd, currentValue.length));
  const actual = currentValue.length - (end - start) + insertedValue.length;
  if (actual > limit) {
    return { accepted: false, error: { code: "san-length", limit, actual } };
  }
  return {
    accepted: true,
    value: `${currentValue.slice(0, start)}${insertedValue}${currentValue.slice(end)}`,
  };
}

function clampSelection(value: number, length: number) {
  if (!Number.isFinite(value)) return length;
  return Math.max(0, Math.min(length, Math.floor(value)));
}
