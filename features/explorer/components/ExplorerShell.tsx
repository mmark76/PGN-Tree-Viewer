"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { DEFAULT_POSITION } from "chess.js";
import {
  DEFAULT_LOCALE,
  firstMovesLabel,
  gamesLabel,
  importErrorMessage,
  importProgressLabel,
  importSuccess,
  messages,
} from "../i18n";
import type { Locale } from "../i18n";
import { buildTree, gameCount, indexTree, pathToNode } from "../services/treeBuilder";
import { playBoardMove, promotionChoicesForMove } from "../services/boardMove";
import type { PlayedBoardMove, PromotionPiece } from "../services/boardMove";
import { MAX_TREE_ZOOM, MIN_TREE_ZOOM } from "../services/treeLayout";
import {
  downloadBaseName,
  downloadTextFile,
  serializeChessTreeJson,
  serializeTreeToPgn,
  serializeTreeToSvg,
} from "../services/treeFiles";
import {
  assertFileSizeWithinLimit,
  assertLineCollectionWithinLimits,
  assertNodeCountWithinLimit,
} from "../services/inputLimits";
import {
  importKindForFile,
  normalizeImportError,
  normalizeLineBuildError,
} from "../services/importPipeline";
import type {
  ImportErrorDetails,
  ImportPayload,
  ImportProgress,
  ImportWorkerResponse,
  LineBuildPayload,
} from "../services/importPipeline";
import { createManualLine, upsertManualLine, upsertManualLines } from "../services/manualLines";
import { appendManualMoveToTree } from "../services/manualTree";
import {
  applyDocumentLocale,
  readStoredLocale,
  storeLocale,
} from "../services/localeStorage";
import {
  resolveSelectionAfterCollapse,
  revealSelectionAncestors,
} from "../services/treeSelection";
import {
  isExplorerDataMutationLocked,
} from "../services/explorerTaskLock";
import type { ExplorerDataTask } from "../services/explorerTaskLock";
import { DEFAULT_SETTINGS, readStoredSettings, storeSettings } from "../settings";
import type { ExplorerSettings } from "../settings";
import type { LineRecord, TreeNode } from "../types";
import { ExplorerFooter } from "./ExplorerFooter";
import { ExplorerHeader } from "./ExplorerHeader";
import { MoveTree } from "./MoveTree";
import { PositionInspector } from "./PositionInspector";
import { SettingsPanel } from "./SettingsPanel";
import { DownloadPanel } from "./DownloadPanel";
import { SanPastePanel } from "./SanPastePanel";
import { PromotionDialog } from "./PromotionDialog";
import type { DownloadFormat } from "./DownloadPanel";

export type TreeViewMode = "smart" | "overview" | "manual";

type ExplorerData = {
  lines: LineRecord[];
  tree: TreeNode;
};

type PendingPromotion = {
  choices: readonly PromotionPiece[];
  fen: string;
  from: string;
  nodeId: string;
  to: string;
};

type ExplorerSnapshot = {
  collapsedIds: Set<string>;
  contentDirty: boolean;
  data: ExplorerData;
  fileName: string;
  fitRequest: number;
  flipped: boolean;
  selectedId: string;
  settings: ExplorerSettings;
  treeViewMode: TreeViewMode;
  zoom: number;
};

export function ExplorerShell() {
  const [data, setData] = useState<ExplorerData>(() => ({ lines: [], tree: buildTree([]) }));
  const { lines, tree } = data;
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    percent: 0,
    stage: "reading",
  });
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const localeRef = useRef(locale);
  const fileInput = useRef<HTMLInputElement>(null);
  const treeSectionRef = useRef<HTMLElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerTaskRef = useRef<ExplorerDataTask | null>(null);
  const importRequestId = useRef(0);
  const index = useMemo(() => indexTree(tree), [tree]);
  const [selectedId, setSelectedId] = useState("start");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.67);
  const [treeViewMode, setTreeViewMode] = useState<TreeViewMode>("smart");
  const [fitRequest, setFitRequest] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [settings, setSettings] = useState<ExplorerSettings>({ ...DEFAULT_SETTINGS });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [sanOpen, setSanOpen] = useState(false);
  const [manualBuildError, setManualBuildError] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<ExplorerSnapshot | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const selected = index.get(selectedId) ?? tree;
  const hasTree = tree.children.length > 0;
  const text = messages[locale];
  const appStyle = {
    "--forest": settings.accentColor,
    "--forest-2": settings.accentColor,
  } as CSSProperties;
  const dataMutationLocked = importing || pendingPromotion !== null;

  const captureSnapshot = (): ExplorerSnapshot => ({
    collapsedIds: new Set(collapsedIds),
    contentDirty,
    // Tree and line updates replace immutable values, so retaining the current
    // reference is an O(1) snapshot even for a tree at the configured node cap.
    data,
    fileName,
    fitRequest,
    flipped,
    selectedId,
    settings: { ...settings },
    treeViewMode,
    zoom,
  });

  const confirmReplacement = () => {
    if (!hasTree || !contentDirty) return { proceed: true, snapshot: null } as const;
    if (!window.confirm(text.replaceUnsavedTree)) {
      return { proceed: false, snapshot: null } as const;
    }
    return { proceed: true, snapshot: captureSnapshot() } as const;
  };

  const restorePreviousTree = () => {
    if (!undoSnapshot || dataMutationLocked) return;
    const snapshot = undoSnapshot;
    setData(snapshot.data);
    setFileName(snapshot.fileName);
    setSelectedId(snapshot.selectedId);
    setCollapsedIds(new Set(snapshot.collapsedIds));
    setSettings({ ...snapshot.settings });
    storeSettings(snapshot.settings);
    setContentDirty(snapshot.contentDirty);
    setZoom(snapshot.zoom);
    setTreeViewMode(snapshot.treeViewMode);
    setFitRequest(snapshot.fitRequest);
    setFlipped(snapshot.flipped);
    setUndoSnapshot(null);
    setNotice(text.treeRestored);
    setNoticeIsError(false);
    window.requestAnimationFrame(() => {
      treeSectionRef.current
        ?.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSettings(readStoredSettings());
      const storedLocale = readStoredLocale();
      localeRef.current = storedLocale;
      setLocale(storedLocale);
      applyDocumentLocale(storedLocale);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  const openFilePicker = () => {
    if (dataMutationLocked || isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    fileInput.current?.click();
  };

  const changeLocale = (nextLocale: Locale) => {
    localeRef.current = nextLocale;
    setLocale(nextLocale);
    applyDocumentLocale(nextLocale);
    storeLocale(nextLocale);
    setNotice("");
    setNoticeIsError(false);
  };

  const changeSettings = (nextSettings: ExplorerSettings) => {
    if (isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    if (nextSettings.treeDirection !== settings.treeDirection) {
      setTreeViewMode("smart");
      setFitRequest((value) => value + 1);
    }
    setSettings(nextSettings);
    storeSettings(nextSettings);
  };

  const changeZoom = (step: number) => {
    setTreeViewMode("manual");
    setZoom((value) => Math.min(MAX_TREE_ZOOM, Math.max(MIN_TREE_ZOOM, value + step)));
  };

  const changeTreeViewMode = (mode: Exclude<TreeViewMode, "manual">) => {
    setTreeViewMode(mode);
    setFitRequest((value) => value + 1);
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (dataMutationLocked || isExplorerDataMutationLocked(importing, workerTaskRef.current)) {
      event.target.value = "";
      return;
    }
    const kind = importKindForFile(file);
    try {
      assertFileSizeWithinLimit(file.size);
    } catch (error) {
      const normalized = normalizeImportError(error, kind);
      setNotice(importErrorMessage(locale, normalized));
      setNoticeIsError(true);
      event.target.value = "";
      return;
    }

    const replacement = confirmReplacement();
    if (!replacement.proceed) {
      event.target.value = "";
      return;
    }

    workerRef.current?.terminate();
    workerTaskRef.current = "file";
    const requestId = importRequestId.current + 1;
    importRequestId.current = requestId;
    setImporting(true);
    setNotice("");
    setNoticeIsError(false);
    setManualBuildError("");
    setSettingsOpen(false);
    setDownloadOpen(false);
    setImportProgress({ percent: 0, stage: "reading" });
    event.target.value = "";

    const finishSuccess = (payload: ImportPayload) => {
      if (requestId !== importRequestId.current) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      workerTaskRef.current = null;
      setData({ lines: payload.lines, tree: payload.tree });
      if (payload.settings) {
        setSettings(payload.settings);
        storeSettings(payload.settings);
      }
      setNotice(
        payload.kind === "json"
          ? messages[localeRef.current].treeImported
          : importSuccess(localeRef.current, payload.gameCount, payload.skippedCount),
      );
      setNoticeIsError(false);
      setFileName(file.name);
      setSelectedId("start");
      setCollapsedIds(new Set());
      setTreeViewMode("smart");
      setFitRequest((value) => value + 1);
      setContentDirty(false);
      setUndoSnapshot(replacement.snapshot);
      setImporting(false);
    };

    const finishError = (error: ImportErrorDetails) => {
      if (requestId !== importRequestId.current) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      workerTaskRef.current = null;
      setNotice(importErrorMessage(localeRef.current, error));
      setNoticeIsError(true);
      setImporting(false);
    };

    if (typeof Worker === "undefined") {
      finishError({ code: "worker-unavailable" });
      return;
    }

    try {
      const worker = new Worker(new URL("../workers/importWorker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = ({ data: response }: MessageEvent<ImportWorkerResponse>) => {
        if (response.requestId !== importRequestId.current) return;
        if (response.type === "progress") {
          setImportProgress((current) => response.progress.percent >= current.percent
            ? response.progress
            : current);
        } else if (response.type === "success") {
          finishSuccess(response.payload);
        } else if (response.type === "error") {
          finishError(response.error);
        }
      };
      worker.onerror = () => finishError({ code: "worker-unavailable" });
      worker.postMessage({ type: "import", requestId, kind, file });
    } catch {
      finishError({ code: "worker-unavailable" });
    }
  };

  const cancelImport = () => {
    const cancelledTask = workerTaskRef.current;
    importRequestId.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    workerTaskRef.current = null;
    setImporting(false);
    setImportProgress({ percent: 0, stage: "reading" });
    setNotice(text.importCancelled);
    setNoticeIsError(false);
    if (cancelledTask === "tree") setManualBuildError(text.importCancelled);
  };

  const downloadTree = (format: DownloadFormat) => {
    if (dataMutationLocked || isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    const baseName = downloadBaseName(fileName);
    if (format === "pgn") {
      downloadTextFile(serializeTreeToPgn(tree), `${baseName}.pgn`, "application/x-chess-pgn;charset=utf-8");
      return;
    }
    if (format === "svg") {
      downloadTextFile(
        serializeTreeToSvg(tree, locale, settings.accentColor, settings.treeDirection),
        `${baseName}.svg`,
        "image/svg+xml;charset=utf-8",
      );
      return;
    }
    const serializedTree = serializeChessTreeJson(lines, settings, fileName);
    downloadTextFile(
      serializedTree,
      `${baseName}.chess-tree-builder.json`,
      "application/json;charset=utf-8",
    );
    setContentDirty(false);
  };

  const selectAndReveal = (id: string, fallbackParentId: string | null = null) => {
    setCollapsedIds((current) =>
      revealSelectionAncestors(index, current, id, fallbackParentId));
    setSelectedId(id);
  };

  const toggleBranch = (id: string) => {
    const isCollapsing = !collapsedIds.has(id);
    setSelectedId((current) => resolveSelectionAfterCollapse(index, current, id, isCollapsing));
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildManualLines = (
    nextLines: LineRecord[],
    successMessage: string,
    onSuccess: () => void,
  ) => {
    if (isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    workerRef.current?.terminate();
    workerTaskRef.current = "tree";
    const requestId = importRequestId.current + 1;
    importRequestId.current = requestId;
    setImporting(true);
    setImportProgress({ percent: 0, stage: "building" });
    setManualBuildError("");
    setNotice("");
    setNoticeIsError(false);

    const finishSuccess = (payload: LineBuildPayload) => {
      if (requestId !== importRequestId.current) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      workerTaskRef.current = null;
      setData({ lines: payload.lines, tree: payload.tree });
      setImporting(false);
      setManualBuildError("");
      setNotice(successMessage);
      setNoticeIsError(false);
      onSuccess();
    };

    const finishError = (error: ImportErrorDetails) => {
      if (requestId !== importRequestId.current) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      workerTaskRef.current = null;
      const message = importErrorMessage(localeRef.current, error);
      setImporting(false);
      setManualBuildError(message);
      setNotice(message);
      setNoticeIsError(true);
    };

    if (typeof Worker === "undefined") {
      finishError({ code: "worker-unavailable" });
      return;
    }

    try {
      const worker = new Worker(new URL("../workers/importWorker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = ({ data: response }: MessageEvent<ImportWorkerResponse>) => {
        if (response.requestId !== importRequestId.current) return;
        if (response.type === "progress") {
          setImportProgress((current) => response.progress.percent >= current.percent
            ? response.progress
            : current);
        } else if (response.type === "build-success") {
          finishSuccess(response.payload);
        } else if (response.type === "error") {
          finishError(response.error);
        }
      };
      worker.onerror = () => finishError({ code: "worker-unavailable" });
      worker.postMessage({ type: "build-tree", requestId, lines: nextLines });
    } catch {
      finishError({ code: "worker-unavailable" });
    }
  };

  const appendBoardMove = (parent: TreeNode, played: PlayedBoardMove) => {
    const existing = parent.children.find((child) => child.san === played.san);
    if (existing) {
      selectAndReveal(existing.id, parent.id);
      return true;
    }

    const moves = [...pathToNode(parent, index), played.san];
    const moveKey = `${played.from}${played.to}${played.promotion ?? ""}`;
    const nextLines = upsertManualLine(lines, moves, tree.fen);
    try {
      assertLineCollectionWithinLimits(nextLines);
      assertNodeCountWithinLimit(index.size + 1);
      const nextTree = appendManualMoveToTree(tree, parent.id, played);
      setData({ lines: nextLines, tree: nextTree });
      setContentDirty(true);
      setUndoSnapshot(null);
      setNotice(text.moveAdded);
      setNoticeIsError(false);
    } catch (error) {
      const normalized = normalizeLineBuildError(error);
      setNotice(importErrorMessage(locale, normalized));
      setNoticeIsError(true);
      return false;
    }
    selectAndReveal(`${parent.id}-${moveKey}`, parent.id);
    return true;
  };

  const addMoveFromBoard = (from: string, to: string) => {
    if (dataMutationLocked || isExplorerDataMutationLocked(importing, workerTaskRef.current)) {
      return false;
    }
    if (isPotentialPromotionMove(from, to)) {
      const promotionChoices = promotionChoicesForMove(selected.fen, from, to);
      if (promotionChoices.length) {
        setPendingPromotion({
          choices: promotionChoices,
          fen: selected.fen,
          from,
          nodeId: selected.id,
          to,
        });
        return false;
      }
    }

    const played = playBoardMove(selected.fen, from, to);
    return played ? appendBoardMove(selected, played) : false;
  };

  const choosePromotion = (promotion: PromotionPiece) => {
    const pending = pendingPromotion;
    if (!pending) return;
    setPendingPromotion(null);
    if (isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    const parent = index.get(pending.nodeId);
    if (!parent || parent.fen !== pending.fen || !pending.choices.includes(promotion)) return;
    const played = playBoardMove(pending.fen, pending.from, pending.to, promotion);
    if (played) appendBoardMove(parent, played);
  };

  const addSanFromSelected = (sanLines: string[][]) => {
    if (isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    const prefix = pathToNode(selected, index);
    const nextLines = upsertManualLines(
      lines,
      sanLines.map((moves) => [...prefix, ...moves]),
      tree.fen,
    );
    if (lineCollectionsEqual(lines, nextLines)) {
      setNotice(text.sanAlreadyPresent);
      setNoticeIsError(false);
      setSanOpen(false);
      return;
    }
    void buildManualLines(nextLines, text.sanAdded, () => {
      setContentDirty(true);
      setUndoSnapshot(null);
      setCollapsedIds(new Set());
      setSanOpen(false);
    });
  };

  const replaceWithSan = (sanLines: string[][], startFen: string) => {
    if (isExplorerDataMutationLocked(importing, workerTaskRef.current)) return;
    const replacement = confirmReplacement();
    if (!replacement.proceed) return;
    const nextLines = sanLines.map((moves) => createManualLine(moves, startFen));
    void buildManualLines(nextLines, text.sanTreeCreated, () => {
      setFileName("");
      setSelectedId("start");
      setCollapsedIds(new Set());
      setContentDirty(true);
      setUndoSnapshot(replacement.snapshot);
      setSanOpen(false);
      setTreeViewMode("smart");
      setFitRequest((value) => value + 1);
    });
  };

  return (
    <div
      className="app-shell"
      data-text-size={settings.textSize}
      data-board-size={settings.boardSize}
      data-font={settings.font}
      data-content-dirty={contentDirty}
      style={appStyle}
    >
      <input
        ref={fileInput}
        id="tree-file"
        type="file"
        accept=".pgn,.json,text/plain,application/json"
        disabled={dataMutationLocked}
        hidden
        tabIndex={-1}
        onChange={importFile}
      />
      <ExplorerHeader
        sourceLabel={fileName || text.noPgnSource}
        importing={importing}
        importProgress={importProgress.percent}
        importProgressLabel={importProgressLabel(locale, importProgress.stage, importProgress.percent)}
        locale={locale}
        downloadDisabled={!hasTree || dataMutationLocked}
        uploadDisabled={dataMutationLocked}
        onLocaleChange={changeLocale}
        onCancelImport={cancelImport}
        onOpenFilePicker={openFilePicker}
        onOpenDownload={() => setDownloadOpen(true)}
        onOpenSan={() => {
          setManualBuildError("");
          setSanOpen(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="workspace">
        <section ref={treeSectionRef} className="tree-section" id="move-tree">
          <div className="tree-header">
            <div className="tree-heading">
              <strong>{text.moveTree}</strong>
              {(fileName || !hasTree) && <span>{fileName || text.noFile}</span>}
            </div>
            {hasTree ? (
              <div className="tree-tools">
                <span className="tree-summary">
                  {gameCount(tree.results) ? `${gamesLabel(locale, gameCount(tree.results))} · ` : ""}
                  {firstMovesLabel(locale, tree.children.length)}
                </span>
                <button className="icon-button" type="button" onClick={() => changeZoom(-0.1)} aria-label={text.zoomOut}>−</button>
                <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                <button className="icon-button" type="button" onClick={() => changeZoom(0.1)} aria-label={text.zoomIn}>+</button>
                <button
                  className={`icon-button${treeViewMode === "smart" ? " active" : ""}`}
                  type="button"
                  onClick={() => changeTreeViewMode("smart")}
                  aria-label={text.smartTreeView}
                  aria-pressed={treeViewMode === "smart"}
                  title={text.smartTreeView}
                >
                  ◉
                </button>
                <button
                  className={`icon-button${treeViewMode === "overview" ? " active" : ""}`}
                  type="button"
                  onClick={() => changeTreeViewMode("overview")}
                  aria-label={text.fitTree}
                  aria-pressed={treeViewMode === "overview"}
                  title={text.fitTree}
                >
                  ⛶
                </button>
                <button className="icon-button" type="button" onClick={() => setCollapsedIds(new Set())} aria-label={text.expandAll}>↗</button>
              </div>
            ) : (
              <button className="button" type="button" onClick={openFilePicker} disabled={dataMutationLocked}>
                {text.importPgn}
              </button>
            )}
          </div>
          {notice && (
            <div className={`notice${noticeIsError ? " error" : ""}`} role="status">
              {notice}
            </div>
          )}
          {undoSnapshot && (
            <div className="notice notice-with-action" role="status">
              <span>{text.previousTreeAvailable}</span>
              <button
                className="button notice-action"
                type="button"
                onClick={restorePreviousTree}
                disabled={dataMutationLocked}
              >
                {text.undoReplacement}
              </button>
            </div>
          )}
          {hasTree ? (
            <MoveTree
              root={tree}
              selectedId={selectedId}
              collapsedIds={collapsedIds}
              zoom={zoom}
              viewMode={treeViewMode}
              fitRequest={fitRequest}
              locale={locale}
              direction={settings.treeDirection}
              onZoomChange={setZoom}
              onSelect={selectAndReveal}
              onToggle={toggleBranch}
            />
          ) : (
            <div className="tree-empty" aria-label={text.emptyTreeArea} />
          )}
        </section>
        <PositionInspector
          node={selected}
          path={pathToNode(selected, index)}
          hasData={hasTree}
          locale={locale}
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
          onBack={() => selected.parentId && selectAndReveal(selected.parentId)}
          onForward={() => selected.children[0] && selectAndReveal(selected.children[0].id)}
          onMove={addMoveFromBoard}
          lightSquareColor={settings.lightSquareColor}
          darkSquareColor={settings.darkSquareColor}
          sourceNote={hasTree ? (fileName ? `${fileName} · ${gamesLabel(locale, gameCount(tree.results))}` : "") : text.waitingForPgn}
          editingDisabled={dataMutationLocked}
        />
      </main>
      <ExplorerFooter locale={locale} />
      {settingsOpen && (
        <SettingsPanel
          locale={locale}
          settings={settings}
          onChange={changeSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {downloadOpen && hasTree && (
        <DownloadPanel
          locale={locale}
          onDownload={downloadTree}
          onClose={() => setDownloadOpen(false)}
        />
      )}
      {sanOpen && (
        <SanPastePanel
          locale={locale}
          selectedFen={selected.fen}
          selectedLabel={selected.id === "start" ? text.initialPosition : selected.san}
          selectedIsStandardRoot={selected.id === "start" && tree.fen === DEFAULT_POSITION}
          building={dataMutationLocked}
          buildProgress={importProgress}
          buildError={manualBuildError}
          onAdd={addSanFromSelected}
          onReplace={replaceWithSan}
          onCancelBuild={cancelImport}
          onClose={() => {
            if (workerTaskRef.current === "tree") cancelImport();
            setSanOpen(false);
          }}
        />
      )}
      {pendingPromotion && (
        <PromotionDialog
          choices={pendingPromotion.choices}
          locale={locale}
          onChoose={choosePromotion}
          onClose={() => setPendingPromotion(null)}
        />
      )}
    </div>
  );
}

function lineCollectionsEqual(left: readonly LineRecord[], right: readonly LineRecord[]) {
  return left.length === right.length && left.every((line, index) => {
    const other = right[index];
    return Boolean(other)
      && line.opening === other.opening
      && line.startFen === other.startFen
      && line.results.white === other.results.white
      && line.results.draw === other.results.draw
      && line.results.black === other.results.black
      && line.results.unknown === other.results.unknown
      && line.moves.length === other.moves.length
      && line.moves.every((move, moveIndex) => move === other.moves[moveIndex]);
  });
}

function isPotentialPromotionMove(from: string, to: string) {
  return (from[1] === "7" && to[1] === "8")
    || (from[1] === "2" && to[1] === "1");
}
