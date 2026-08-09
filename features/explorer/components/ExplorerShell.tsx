"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { DEFAULT_LOCALE, firstMovesLabel, gamesLabel, importSuccess, messages } from "../i18n";
import type { Locale } from "../i18n";
import { buildTree, indexTree, pathToNode, resultCount } from "../services/treeBuilder";
import { parsePgnCollection } from "../services/pgnParser";
import { playBoardMove } from "../services/boardMove";
import {
  downloadBaseName,
  downloadTextFile,
  parseChessTreeJson,
  serializeChessTreeJson,
  serializeTreeToPgn,
  serializeTreeToSvg,
} from "../services/treeFiles";
import { DEFAULT_SETTINGS, readStoredSettings, storeSettings } from "../settings";
import type { ExplorerSettings } from "../settings";
import type { LineRecord } from "../types";
import { ExplorerFooter } from "./ExplorerFooter";
import { ExplorerHeader } from "./ExplorerHeader";
import { MoveTree } from "./MoveTree";
import { PositionInspector } from "./PositionInspector";
import { SettingsPanel } from "./SettingsPanel";
import { DownloadPanel } from "./DownloadPanel";
import type { DownloadFormat } from "./DownloadPanel";

export function ExplorerShell() {
  const [lines, setLines] = useState<LineRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const fileInput = useRef<HTMLInputElement>(null);
  const tree = useMemo(() => buildTree(lines), [lines]);
  const index = useMemo(() => indexTree(tree), [tree]);
  const [selectedId, setSelectedId] = useState("start");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.82);
  const [flipped, setFlipped] = useState(false);
  const [settings, setSettings] = useState<ExplorerSettings>({ ...DEFAULT_SETTINGS });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const selected = index.get(selectedId) ?? tree;
  const hasTree = tree.children.length > 0;
  const text = messages[locale];
  const appStyle = {
    "--forest": settings.accentColor,
    "--forest-2": settings.accentColor,
  } as CSSProperties;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSettings(readStoredSettings()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const openFilePicker = () => fileInput.current?.click();

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    setNotice("");
  };

  const changeSettings = (nextSettings: ExplorerSettings) => {
    setSettings(nextSettings);
    storeSettings(nextSettings);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setNotice(text.fileTooLarge);
      event.target.value = "";
      return;
    }
    setImporting(true);
    setNotice("");
    const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    try {
      const content = await file.text();
      if (isJson) {
        const parsed = parseChessTreeJson(content);
        setLines(parsed.lines);
        changeSettings(parsed.settings);
        setNotice(text.treeImported);
      } else {
        const parsed = parsePgnCollection(content);
        if (!parsed.lines.length) throw new Error(text.noValidMoves);
        setLines(parsed.lines);
        setNotice(importSuccess(locale, parsed.gameCount, parsed.skippedCount));
      }
      setFileName(file.name);
      setSelectedId("start");
      setCollapsedIds(new Set());
    } catch (error) {
      setNotice(isJson ? text.invalidTreeFile : error instanceof Error ? error.message : text.readFailed);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const downloadTree = (format: DownloadFormat) => {
    const baseName = downloadBaseName(fileName);
    if (format === "pgn") {
      downloadTextFile(serializeTreeToPgn(tree), `${baseName}.pgn`, "application/x-chess-pgn;charset=utf-8");
      return;
    }
    if (format === "svg") {
      downloadTextFile(
        serializeTreeToSvg(tree, locale, settings.accentColor),
        `${baseName}.svg`,
        "image/svg+xml;charset=utf-8",
      );
      return;
    }
    downloadTextFile(
      serializeChessTreeJson(lines, settings, fileName),
      `${baseName}.chess-tree-builder.json`,
      "application/json;charset=utf-8",
    );
  };

  const toggleBranch = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addMoveFromBoard = (from: string, to: string) => {
    const played = playBoardMove(selected.fen, from, to);
    if (!played) return false;

    const existing = selected.children.find((child) => child.san === played.san);
    if (existing) {
      setSelectedId(existing.id);
      setCollapsedIds((current) => {
        if (!current.has(selected.id)) return current;
        const next = new Set(current);
        next.delete(selected.id);
        return next;
      });
      return true;
    }

    const moves = [...pathToNode(selected, index), played.san];
    const moveKey = `${played.from}${played.to}${played.promotion ?? ""}`;
    setLines((current) => [
      ...current,
      {
        moves,
        opening: "__manual__",
        results: { white: 0, draw: 0, black: 0 },
      },
    ]);
    setSelectedId(`${selected.id}-${moveKey}`);
    setCollapsedIds((current) => {
      if (!current.has(selected.id)) return current;
      const next = new Set(current);
      next.delete(selected.id);
      return next;
    });
    setNotice(text.moveAdded);
    return true;
  };

  return (
    <div
      className="app-shell"
      data-text-size={settings.textSize}
      data-board-size={settings.boardSize}
      data-font={settings.font}
      style={appStyle}
    >
      <input
        ref={fileInput}
        id="tree-file"
        className="file-input"
        type="file"
        accept=".pgn,.json,text/plain,application/json"
        onChange={importFile}
      />
      <ExplorerHeader
        sourceLabel={fileName || text.noPgnSource}
        importing={importing}
        locale={locale}
        downloadDisabled={!hasTree}
        onLocaleChange={changeLocale}
        onOpenDownload={() => setDownloadOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="workspace">
        <section className="tree-section" id="move-tree">
          <div className="tree-header">
            <div className="tree-heading">
              <strong>{text.moveTree}</strong>
              {(fileName || !hasTree) && <span>{fileName || text.noFile}</span>}
            </div>
            {hasTree ? (
              <div className="tree-tools">
                <span className="tree-summary">
                  {resultCount(tree.results) ? `${gamesLabel(locale, resultCount(tree.results))} · ` : ""}
                  {firstMovesLabel(locale, tree.children.length)}
                </span>
                <button className="icon-button" type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))} aria-label={text.zoomOut}>−</button>
                <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                <button className="icon-button" type="button" onClick={() => setZoom((value) => Math.min(1.2, value + 0.1))} aria-label={text.zoomIn}>+</button>
                <button className="icon-button" type="button" onClick={() => setCollapsedIds(new Set())} aria-label={text.expandAll}>↗</button>
              </div>
            ) : (
              <button className="button" type="button" onClick={openFilePicker} disabled={importing}>
                {text.importPgn}
              </button>
            )}
          </div>
          {notice && <div className={`notice${notice === text.noValidMoves || notice === text.invalidTreeFile || notice === text.fileTooLarge || notice === text.readFailed ? " error" : ""}`} role="status">{notice}</div>}
          {hasTree ? (
            <MoveTree root={tree} selectedId={selectedId} collapsedIds={collapsedIds} zoom={zoom} locale={locale} onSelect={setSelectedId} onToggle={toggleBranch} />
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
          onBack={() => selected.parentId && setSelectedId(selected.parentId)}
          onForward={() => selected.children[0] && setSelectedId(selected.children[0].id)}
          onMove={addMoveFromBoard}
          lightSquareColor={settings.lightSquareColor}
          darkSquareColor={settings.darkSquareColor}
          sourceNote={hasTree ? (fileName ? `${fileName} · ${gamesLabel(locale, resultCount(tree.results))}` : "") : text.waitingForPgn}
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
    </div>
  );
}
