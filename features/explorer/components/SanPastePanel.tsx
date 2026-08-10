"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Chess } from "chess.js";
import { messages } from "../i18n";
import type { Locale } from "../i18n";
import { validateSanSequence } from "../services/sanParser";
import type { SanValidationResult } from "../services/sanParser";
import { createSanPasteState, sanPasteReducer } from "../services/sanPasteState";

type SanPastePanelProps = {
  locale: Locale;
  selectedFen: string;
  selectedLabel: string;
  onAdd: (moves: string[]) => void;
  onReplace: (moves: string[]) => void;
  onClose: () => void;
};

export function SanPastePanel({ locale, selectedFen, selectedLabel, onAdd, onReplace, onClose }: SanPastePanelProps) {
  const text = messages[locale];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, dispatch] = useReducer(sanPasteReducer, undefined, createSanPasteState);
  const [clipboardError, setClipboardError] = useState(false);

  useEffect(() => {
    textareaRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const pasteClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      dispatch({ type: "replace", value: clipboardText });
      setClipboardError(false);
    } catch {
      setClipboardError(true);
      textareaRef.current?.focus();
    }
  };

  const validate = () => {
    dispatch({
      type: "validated",
      fromStart: validateSanSequence(state.value),
      fromSelected: validateSanSequence(state.value, selectedFen),
    });
  };

  const dirty = state.value !== state.checkedValue;
  const startResult = dirty ? null : state.fromStart;
  const selectedResult = dirty ? null : state.fromSelected;

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog san-dialog" role="dialog" aria-modal="true" aria-labelledby="san-title">
        <div className="settings-head">
          <div>
            <h2 id="san-title">{text.pasteSan}</h2>
            <p>{text.pasteSanDescription}</p>
          </div>
          <button className="settings-close" type="button" onClick={onClose} aria-label={text.closeSan}>×</button>
        </div>
        <div className="san-body">
          <label className="san-input-label" htmlFor="san-input">{text.sanMoves}</label>
          <textarea
            ref={textareaRef}
            id="san-input"
            value={state.value}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5"
            onChange={(event) => dispatch({ type: "edit", value: event.target.value })}
            spellCheck={false}
          />
          <div className="san-actions-top">
            <button className="button" type="button" onClick={pasteClipboard}>⌘ {text.pasteClipboard}</button>
            <button className="button primary" type="button" onClick={validate} disabled={!state.value.trim()}>{text.checkSan}</button>
          </div>
          {clipboardError && <p className="san-message error" role="status">{text.clipboardFailed}</p>}
          {startResult && <ValidationSummary result={startResult} locale={locale} label={text.newTree} />}
          {selectedResult && selectedFen !== new Chess().fen() && (
            <ValidationSummary result={selectedResult} locale={locale} label={`${text.addFromHere}: ${selectedLabel}`} />
          )}
        </div>
        <div className="settings-footer san-footer">
          <button className="button" type="button" disabled={!startResult?.valid} onClick={() => startResult?.valid && onReplace(startResult.moves)}>{text.newTree}</button>
          <button className="button primary" type="button" disabled={!selectedResult?.valid} onClick={() => selectedResult?.valid && onAdd(selectedResult.moves)}>{text.addFromHere}</button>
        </div>
      </section>
    </div>
  );
}

function ValidationSummary({ result, locale, label }: { result: SanValidationResult; locale: Locale; label: string }) {
  const text = messages[locale];
  if (!result.valid) {
    return (
      <div className="san-validation invalid" role="status">
        <strong>{label}</strong>
        <span>{result.invalidToken ? `${text.invalidSanMove} ${result.tokenNumber}: “${result.invalidToken}”` : text.emptySan}</span>
        {result.moves.length > 0 && <small>{text.validUntil}: {result.moves.join(" ")}</small>}
      </div>
    );
  }
  return (
    <div className="san-validation valid" role="status">
      <strong>✓ {label}</strong>
      <span>{result.moves.length} {text.validSanMoves}</span>
      <small>{result.moves.join(" ")}</small>
    </div>
  );
}
