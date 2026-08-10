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

export const SETTINGS_STORAGE_KEY = "chesstree-settings-v1";

export const DEFAULT_SETTINGS: ExplorerSettings = {
  accentColor: "#173f32",
  lightSquareColor: "#f0d9b5",
  darkSquareColor: "#6f8f72",
  textSize: "standard",
  boardSize: "standard",
  font: "classic",
  treeDirection: "right",
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

const isOneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && options.includes(value as T);

export function normalizeSettings(value: unknown): ExplorerSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<ExplorerSettings>;

  return {
    accentColor: isHexColor(candidate.accentColor) ? candidate.accentColor : DEFAULT_SETTINGS.accentColor,
    lightSquareColor: isHexColor(candidate.lightSquareColor) ? candidate.lightSquareColor : DEFAULT_SETTINGS.lightSquareColor,
    darkSquareColor: isHexColor(candidate.darkSquareColor) ? candidate.darkSquareColor : DEFAULT_SETTINGS.darkSquareColor,
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
