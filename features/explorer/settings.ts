export type TextSize = "small" | "standard" | "large";
export type BoardSize = "compact" | "standard" | "large";
export type FontChoice = "classic" | "modern" | "serif";
export type TreeDirection = "right" | "down";

export type ExplorerSettings = {
  accentColor: string;
  lightSquareColor: string;
  darkSquareColor: string;
  textSize: TextSize;
  boardSize: BoardSize;
  font: FontChoice;
  treeDirection: TreeDirection;
};

export type ExplorerColorSettings = Pick<
  ExplorerSettings,
  "accentColor" | "lightSquareColor" | "darkSquareColor"
>;

export type ColorSettingsValidation = {
  accentColorIsValid: boolean;
  squareColorsAreValid: boolean;
  isValid: boolean;
};

export const SETTINGS_STORAGE_KEY = "chesstree-settings-v1";

export const DEFAULT_SETTINGS: ExplorerSettings = {
  accentColor: "#173f32",
  lightSquareColor: "#f0d9b5",
  darkSquareColor: "#6f8f72",
  textSize: "small",
  boardSize: "compact",
  font: "serif",
  treeDirection: "right",
};

export const MIN_ACCENT_CONTRAST = 4.5;
export const MIN_SQUARE_CONTRAST = 2.5;

const BLACK = "#000000";
const WHITE = "#ffffff";

export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** Returns the WCAG relative luminance for a six-digit sRGB hex color. */
export function relativeLuminance(hexColor: string): number {
  if (!isHexColor(hexColor)) return Number.NaN;

  const channels = [1, 3, 5].map((offset) => Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

/** Returns the WCAG contrast ratio between two six-digit sRGB hex colors. */
export function contrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = relativeLuminance(firstColor);
  const secondLuminance = relativeLuminance(secondColor);
  if (!Number.isFinite(firstLuminance) || !Number.isFinite(secondLuminance)) return Number.NaN;

  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isAccentColorSafe(value: unknown): value is string {
  return isHexColor(value) && contrastRatio(value, WHITE) >= MIN_ACCENT_CONTRAST;
}

export function areSquareColorsSafe(lightColor: unknown, darkColor: unknown): boolean {
  return isHexColor(lightColor)
    && isHexColor(darkColor)
    && contrastRatio(lightColor, darkColor) >= MIN_SQUARE_CONTRAST;
}

export function validateColorSettings(colors: ExplorerColorSettings): ColorSettingsValidation {
  const accentColorIsValid = isAccentColorSafe(colors.accentColor);
  const squareColorsAreValid = areSquareColorsSafe(colors.lightSquareColor, colors.darkSquareColor);
  return {
    accentColorIsValid,
    squareColorsAreValid,
    isValid: accentColorIsValid && squareColorsAreValid,
  };
}

/** Picks black or white independently for readable board notation. */
export function getNotationColor(squareColor: string): typeof BLACK | typeof WHITE {
  return contrastRatio(squareColor, BLACK) >= contrastRatio(squareColor, WHITE) ? BLACK : WHITE;
}

const isOneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && options.includes(value as T);

export function normalizeSettings(value: unknown): ExplorerSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<ExplorerSettings>;

  const accentColor = isAccentColorSafe(candidate.accentColor)
    ? candidate.accentColor
    : DEFAULT_SETTINGS.accentColor;
  let lightSquareColor = isHexColor(candidate.lightSquareColor)
    ? candidate.lightSquareColor
    : DEFAULT_SETTINGS.lightSquareColor;
  let darkSquareColor = isHexColor(candidate.darkSquareColor)
    ? candidate.darkSquareColor
    : DEFAULT_SETTINGS.darkSquareColor;

  if (!areSquareColorsSafe(lightSquareColor, darkSquareColor)) {
    lightSquareColor = DEFAULT_SETTINGS.lightSquareColor;
    darkSquareColor = DEFAULT_SETTINGS.darkSquareColor;
  }

  return {
    accentColor,
    lightSquareColor,
    darkSquareColor,
    textSize: isOneOf(candidate.textSize, ["small", "standard", "large"]) ? candidate.textSize : DEFAULT_SETTINGS.textSize,
    boardSize: isOneOf(candidate.boardSize, ["compact", "standard", "large"]) ? candidate.boardSize : DEFAULT_SETTINGS.boardSize,
    font: isOneOf(candidate.font, ["classic", "modern", "serif"]) ? candidate.font : DEFAULT_SETTINGS.font,
    treeDirection: isOneOf(candidate.treeDirection, ["right", "down"])
      ? candidate.treeDirection
      : DEFAULT_SETTINGS.treeDirection,
  };
}

export function readStoredSettings(): ExplorerSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return saved ? normalizeSettings(JSON.parse(saved)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function storeSettings(settings: ExplorerSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The interface still works when browser storage is unavailable.
  }
}
