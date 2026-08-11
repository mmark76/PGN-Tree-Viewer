import type { ExplorerSettings } from "../settings";
import type { LineRecord, TreeNode } from "../types";
import type { InputLimitErrorCode } from "./inputLimits";
import { parsePgnCollection } from "./pgnParser";
import { validateSanContexts } from "./sanParser";
import type { SanValidationContexts } from "./sanParser";
import { buildTree, buildTreeFromPreparedLines, gameCount } from "./treeBuilder";
import { parseChessTreeJson } from "./treeFiles";

export type ImportFileKind = "pgn" | "json";
export type ImportProgressStage = "reading" | "parsing" | "building" | "validating";

export type ImportProgress = {
  percent: number;
  stage: ImportProgressStage;
};

export type ImportErrorCode = InputLimitErrorCode
  | "no-valid-moves"
  | "invalid-tree-file"
  | "invalid-start-fen"
  | "mixed-start-fen"
  | "invalid-results"
  | "unsafe-integer"
  | "invalid-lines"
  | "worker-unavailable"
  | "read-failed";

export type ImportErrorDetails = {
  code: ImportErrorCode;
  limit?: number;
  actual?: number;
};

export type ImportPayload = {
  kind: ImportFileKind;
  lines: LineRecord[];
  tree: TreeNode;
  settings: ExplorerSettings | null;
  gameCount: number;
  skippedCount: number;
};

export type LineBuildPayload = {
  lines: LineRecord[];
  tree: TreeNode;
};

export type ImportWorkerRequest =
  | {
      type: "import";
      requestId: number;
      kind: ImportFileKind;
      file: File;
    }
  | {
      type: "build-tree";
      requestId: number;
      lines: LineRecord[];
    }
  | {
      type: "validate-san";
      requestId: number;
      text: string;
      selectedFen: string;
    };

export type ImportWorkerResponse =
  | {
      type: "progress";
      requestId: number;
      progress: ImportProgress;
    }
  | {
      type: "success";
      requestId: number;
      payload: ImportPayload;
    }
  | {
      type: "build-success";
      requestId: number;
      payload: LineBuildPayload;
    }
  | {
      type: "san-success";
      requestId: number;
      payload: SanValidationContexts;
    }
  | {
      type: "san-error";
      requestId: number;
    }
  | {
      type: "error";
      requestId: number;
      error: ImportErrorDetails;
    };

export class ImportPipelineError extends Error {
  readonly code: ImportErrorCode;
  readonly limit?: number;
  readonly actual?: number;

  constructor(code: ImportErrorCode, details: Pick<ImportErrorDetails, "limit" | "actual"> = {}) {
    super(code);
    this.name = "ImportPipelineError";
    this.code = code;
    this.limit = details.limit;
    this.actual = details.actual;
  }
}

export function importKindForFile(file: Pick<File, "name" | "type">): ImportFileKind {
  return file.name.toLowerCase().endsWith(".json") || file.type === "application/json"
    ? "json"
    : "pgn";
}

export function processImportText(
  content: string,
  kind: ImportFileKind,
  onProgress: (progress: ImportProgress) => void = () => undefined,
): ImportPayload {
  const report = monotonicProgress(onProgress);
  report({ percent: 25, stage: "parsing" });

  try {
    if (kind === "json") {
      const parsed = parseChessTreeJson(content, { deferMoveValidation: true });
      report({ percent: 72, stage: "building" });
      const tree = buildTree(parsed.lines);
      report({ percent: 100, stage: "building" });
      return {
        kind,
        lines: parsed.lines,
        tree,
        settings: parsed.settings,
        gameCount: gameCount(tree.results),
        skippedCount: 0,
      };
    }

    const parsed = parsePgnCollection(content);
    if (!parsed.lines.length) throw new ImportPipelineError("no-valid-moves");
    report({ percent: 72, stage: "building" });
    const tree = buildTreeFromPreparedLines(parsed.preparedLines);
    report({ percent: 100, stage: "building" });
    return {
      kind,
      lines: parsed.lines,
      tree,
      settings: null,
      gameCount: parsed.gameCount,
      skippedCount: parsed.skippedCount,
    };
  } catch (error) {
    throw normalizeImportError(error, kind);
  }
}

export function processLineBuild(
  lines: LineRecord[],
  onProgress: (progress: ImportProgress) => void = () => undefined,
): LineBuildPayload {
  const report = monotonicProgress(onProgress);
  report({ percent: 15, stage: "building" });
  try {
    const tree = buildTree(lines);
    report({ percent: 100, stage: "building" });
    return { lines, tree };
  } catch (error) {
    throw normalizeLineBuildError(error);
  }
}

export function processSanValidation(
  text: string,
  selectedFen: string,
  onProgress: (progress: ImportProgress) => void = () => undefined,
): SanValidationContexts {
  const report = monotonicProgress(onProgress);
  report({ percent: 10, stage: "validating" });
  const result = validateSanContexts(text, selectedFen);
  report({ percent: 100, stage: "validating" });
  return result;
}

export function normalizeImportError(error: unknown, kind: ImportFileKind): ImportPipelineError {
  if (error instanceof ImportPipelineError) return error;
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
  if (isImportErrorCode(code)) {
    const limit = numericErrorField(error, "limit");
    const actual = numericErrorField(error, "actual");
    return new ImportPipelineError(code, { limit, actual });
  }
  return new ImportPipelineError(kind === "json" ? "invalid-tree-file" : "read-failed");
}

export function normalizeLineBuildError(error: unknown): ImportPipelineError {
  if (error instanceof ImportPipelineError) return error;
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
  if (isImportErrorCode(code)) {
    return new ImportPipelineError(code, {
      limit: numericErrorField(error, "limit"),
      actual: numericErrorField(error, "actual"),
    });
  }
  return new ImportPipelineError("invalid-lines");
}

export function monotonicProgress(
  onProgress: (progress: ImportProgress) => void,
  initialPercent = 0,
) {
  let latest = Math.max(0, Math.min(100, Math.floor(initialPercent)));
  return (progress: ImportProgress) => {
    const percent = Math.max(latest, Math.min(100, Math.floor(progress.percent)));
    latest = percent;
    onProgress({ ...progress, percent });
  };
}

function isImportErrorCode(code: string): code is ImportErrorCode {
  return new Set<ImportErrorCode>([
    "file-size",
    "no-valid-moves",
    "invalid-tree-file",
    "invalid-start-fen",
    "mixed-start-fen",
    "invalid-results",
    "unsafe-integer",
    "invalid-lines",
    "worker-unavailable",
    "game-count",
    "line-count",
    "total-plies",
    "depth",
    "node-count",
    "pgn-block-size",
    "san-length",
    "san-token-count",
    "san-output-lines",
    "san-output-plies",
    "san-nesting",
    "read-failed",
  ]).has(code as ImportErrorCode);
}

function numericErrorField(error: unknown, field: "limit" | "actual") {
  if (!error || typeof error !== "object" || !(field in error)) return undefined;
  const value = (error as Record<"limit" | "actual", unknown>)[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
