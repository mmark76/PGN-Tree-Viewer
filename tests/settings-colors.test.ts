import assert from "node:assert/strict";
import test from "node:test";
import {
  areSquareColorsSafe,
  contrastRatio,
  DEFAULT_SETTINGS,
  getNotationColor,
  isAccentColorSafe,
  MIN_ACCENT_CONTRAST,
  MIN_SQUARE_CONTRAST,
  normalizeSettings,
  relativeLuminance,
  validateColorSettings,
} from "../features/explorer/settings";

test("calculates relative luminance and contrast from six-digit sRGB colors", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#FFFFFF"), 1);
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#000000"), 21);
  assert.equal(Number.isNaN(relativeLuminance("white")), true);
  assert.equal(Number.isNaN(contrastRatio("#ffffff", "invalid")), true);
});

test("enforces the accent and board-square contrast thresholds", () => {
  assert.equal(isAccentColorSafe("#767676"), true);
  assert.equal(contrastRatio("#767676", "#ffffff") >= MIN_ACCENT_CONTRAST, true);
  assert.equal(isAccentColorSafe("#777777"), false);
  assert.equal(isAccentColorSafe("#fff"), false);

  assert.equal(areSquareColorsSafe("#ffffff", "#929292"), true);
  assert.equal(contrastRatio("#ffffff", "#929292") >= MIN_SQUARE_CONTRAST, true);
  assert.equal(areSquareColorsSafe("#ffffff", "#a5a5a5"), false);
  assert.equal(areSquareColorsSafe("#ffffff", "not-a-color"), false);
});

test("keeps every mandated default color valid and unchanged", () => {
  assert.deepEqual(normalizeSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
  assert.deepEqual(validateColorSettings(DEFAULT_SETTINGS), {
    accentColorIsValid: true,
    squareColorsAreValid: true,
    isValid: true,
  });
  assert.equal(
    contrastRatio(DEFAULT_SETTINGS.accentColor, "#ffffff") >= MIN_ACCENT_CONTRAST,
    true,
  );
  assert.equal(
    contrastRatio(DEFAULT_SETTINGS.lightSquareColor, DEFAULT_SETTINGS.darkSquareColor)
      >= MIN_SQUARE_CONTRAST,
    true,
  );
});

test("normalization rejects unsafe colors without discarding valid non-color settings", () => {
  const normalized = normalizeSettings({
    accentColor: "#ffffff",
    lightSquareColor: "#eeeeee",
    darkSquareColor: "#ffffff",
    textSize: "large",
    boardSize: "large",
    font: "modern",
    treeDirection: "down",
  });

  assert.deepEqual(normalized, {
    accentColor: DEFAULT_SETTINGS.accentColor,
    lightSquareColor: DEFAULT_SETTINGS.lightSquareColor,
    darkSquareColor: DEFAULT_SETTINGS.darkSquareColor,
    textSize: "large",
    boardSize: "large",
    font: "modern",
    treeDirection: "down",
  });
});

test("normalization can preserve one valid square color when its safe default pairing works", () => {
  const normalized = normalizeSettings({
    accentColor: "#123ABC",
    lightSquareColor: "invalid",
    darkSquareColor: "#654321",
  });

  assert.equal(normalized.accentColor, "#123ABC");
  assert.equal(normalized.lightSquareColor, DEFAULT_SETTINGS.lightSquareColor);
  assert.equal(normalized.darkSquareColor, "#654321");
});

test("chooses black or white notation independently for each square", () => {
  assert.equal(getNotationColor("#ffffff"), "#000000");
  assert.equal(getNotationColor("#000000"), "#ffffff");
  assert.equal(getNotationColor(DEFAULT_SETTINGS.lightSquareColor), "#000000");
  assert.equal(getNotationColor(DEFAULT_SETTINGS.darkSquareColor), "#000000");

  // Both contrasting board colors can correctly need the same notation color.
  assert.equal(areSquareColorsSafe("#ffffff", "#888888"), true);
  assert.equal(getNotationColor("#ffffff"), getNotationColor("#888888"));
});
