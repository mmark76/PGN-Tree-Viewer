"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { manualRepertoire } from "../data/manualRepertoire";
import { buildTree, indexTree, pathToNode, resultCount } from "../services/treeBuilder";
import { parsePgnCollection } from "../services/pgnParser";
import type { LineRecord } from "../types";
import { ExplorerHeader } from "./ExplorerHeader";
import { MoveTree } from "./MoveTree";
import { PositionInspector } from "./PositionInspector";

export function ExplorerShell() {
  const [lines, setLines] = useState<LineRecord[]>(manualRepertoire);
  const [mode, setMode] = useState<"manual" | "pgn">("manual");
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const tree = useMemo(() => buildTree(lines), [lines]);
  const index = useMemo(() => indexTree(tree), [tree]);
  const [selectedId, setSelectedId] = useState(tree.id);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.82);
  const [flipped, setFlipped] = useState(false);
  const selected = index.get(selectedId) ?? tree;

  const showManualRepertoire = () => {
    setLines(manualRepertoire);
    setMode("manual");
    setFileName("");
    setSelectedId("start");
    setCollapsedIds(new Set());
    setNotice("Επαναφέρθηκε το χειροκίνητο ρεπερτόριο.");
  };

  const importPgn = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setNotice("Το αρχείο είναι μεγαλύτερο από το όριο των 8 MB.");
      event.target.value = "";
      return;
    }
    setImporting(true);
    setNotice("");
    try {
      const parsed = parsePgnCollection(await file.text());
      if (!parsed.lines.length) throw new Error("Δεν βρέθηκαν έγκυρες κινήσεις PGN.");
      setLines(parsed.lines);
      setMode("pgn");
      setFileName(file.name);
      setSelectedId("start");
      setCollapsedIds(new Set());
      setNotice(`${parsed.gameCount} παρτίδ${parsed.gameCount === 1 ? "α" : "ες"} εισήχθησαν${parsed.skippedCount ? ` · ${parsed.skippedCount} παραλείφθηκαν` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Το αρχείο δεν μπόρεσε να διαβαστεί.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const toggleBranch = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="app-shell">
      <input ref={fileInput} id="pgn-file" className="file-input" type="file" accept=".pgn,text/plain" onChange={importPgn} />
      <ExplorerHeader
        sourceLabel={mode === "manual" ? "Διαδραστικός χάρτης ανοιγμάτων" : fileName}
        importing={importing}
      />
      <div className="workspace">
        <section className="tree-section">
          <div className="tree-header">
            <div className="mode-switch" aria-label="Πηγή δεδομένων">
              <button className={`segmented-button${mode === "manual" ? " active" : ""}`} type="button" onClick={showManualRepertoire}>Ρεπερτόριο</button>
              <button className={`segmented-button${mode === "pgn" ? " active" : ""}`} type="button" onClick={() => fileInput.current?.click()}>Εισαγωγή PGN</button>
            </div>
            <div className="tree-tools">
              <span className="tree-summary">{resultCount(tree.results)} παρτίδες · {tree.children.length} πρώτες κινήσεις</span>
              <button className="icon-button" type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))} aria-label="Σμίκρυνση">−</button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button className="icon-button" type="button" onClick={() => setZoom((value) => Math.min(1.2, value + 0.1))} aria-label="Μεγέθυνση">+</button>
              <button className="icon-button" type="button" onClick={() => setCollapsedIds(new Set())} aria-label="Άνοιγμα όλων">↗</button>
            </div>
          </div>
          {notice && <div className={`notice${notice.includes("δεν") ? " error" : ""}`} role="status">{notice}</div>}
          <MoveTree root={tree} selectedId={selectedId} collapsedIds={collapsedIds} zoom={zoom} onSelect={setSelectedId} onToggle={toggleBranch} />
        </section>
        <PositionInspector
          node={selected}
          path={pathToNode(selected, index)}
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
          onBack={() => selected.parentId && setSelectedId(selected.parentId)}
          onForward={() => selected.children[0] && setSelectedId(selected.children[0].id)}
          sourceNote={mode === "manual" ? "Χειροκίνητο ρεπερτόριο · ενημερώνεται ζωντανά" : `${fileName} · ${resultCount(tree.results)} παρτίδες`}
        />
      </div>
    </main>
  );
}
