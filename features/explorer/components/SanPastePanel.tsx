"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { importErrorMessage, importProgressLabel, messages } from "../i18n";
import type { Locale } from "../i18n";
import type { ImportProgress, ImportWorkerResponse } from "../services/importPipeline";
import { DEFAULT_INPUT_LIMITS } from "../services/inputLimits";
import { useModalFocus } from "../services/modalFocus";
import { acceptSanInput } from "../services/sanInput";
import type { SanInputResult } from "../services/sanInput";
import type { SanValidationResult } from "../services/sanParser";
import { createSanPasteState, sanPasteReducer } from "../services/sanPasteState";
import type { SanValidationFailure } from "../services/sanPasteState";

const SAN_VALIDATION_DEBOUNCE_MS = 300;

type SanPastePanelProps = {
  locale: Locale;
  selectedFen: string;
  selectedLabel: string;
  selectedIsStandardRoot: boolean;
  building: boolean;
  buildProgress: ImportProgress;
  buildError: string;
  onAdd: (lines: string[][]) => void;
  onReplace: (lines: string[][], startFen: string) => void;
  onCancelBuild: () => void;
  onClose: () => void;
};

export function SanPastePanel({
  locale,
  selectedFen,
  selectedLabel,
  selectedIsStandardRoot,
  building,
  buildProgress,
  buildError,
  onAdd,
  onReplace,
  onCancelBuild,
  onClose,
}: SanPastePanelProps) {
  const text = messages[locale];
  const dialogRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buildCancelRef = useRef<HTMLButtonElement>(null);
  const previousBuildingRef = useRef(building);
  const validationWorkerRef = useRef<Worker | null>(null);
  const validationRequestIdRef = useRef(0);
  const validationTimeoutRef = useRef<number | null>(null);
  const [state, dispatch] = useReducer(sanPasteReducer, undefined, createSanPasteState);
  const [clipboardError, setClipboardError] = useState(false);
  useModalFocus({ dialogRef, initialFocusRef: textareaRef, onClose });

  useEffect(() => {
    const dialog = dialogRef.current;
    const wasBuilding = previousBuildingRef.current;
    previousBuildingRef.current = building;
    if (!dialog) return;

    if (building) {
      buildCancelRef.current?.focus({ preventScroll: true });
      return;
    }

    if (wasBuilding && !dialog.contains(dialog.ownerDocument.activeElement)) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [building]);

  const stopValidationResources = useCallback(() => {
    if (validationTimeoutRef.current !== null) {
      window.clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
    validationRequestIdRef.current += 1;
    const worker = validationWorkerRef.current;
    validationWorkerRef.current = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }
  }, []);

  const beginValidation = useCallback((value: string) => {
    if (!value.trim() || building) return;
    stopValidationResources();
    const requestId = validationRequestIdRef.current + 1;
    validationRequestIdRef.current = requestId;
    dispatch({ type: "validation-started", requestId, value });

    const fail = (failure: SanValidationFailure) => {
      if (requestId !== validationRequestIdRef.current) return;
      const worker = validationWorkerRef.current;
      validationWorkerRef.current = null;
      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
      }
      dispatch({ type: "validation-failed", requestId, value, failure });
    };

    if (typeof Worker === "undefined") {
      fail("worker-unavailable");
      return;
    }

    try {
      const worker = new Worker(new URL("../workers/importWorker.ts", import.meta.url), {
        type: "module",
      });
      validationWorkerRef.current = worker;
      worker.onmessage = ({ data: response }: MessageEvent<ImportWorkerResponse>) => {
        if (requestId !== validationRequestIdRef.current || response.requestId !== requestId) return;
        if (response.type === "progress" && response.progress.stage === "validating") {
          dispatch({
            type: "validation-progress",
            requestId,
            percent: response.progress.percent,
          });
          return;
        }
        if (response.type === "san-success") {
          worker.onmessage = null;
          worker.onerror = null;
          worker.terminate();
          validationWorkerRef.current = null;
          dispatch({ type: "validated", requestId, value, ...response.payload });
          return;
        }
        if (response.type === "san-error" || response.type === "error") {
          fail("validation-failed");
        }
      };
      worker.onerror = () => fail("worker-unavailable");
      worker.postMessage({ type: "validate-san", requestId, text: value, selectedFen });
    } catch {
      fail("worker-unavailable");
    }
  }, [building, selectedFen, stopValidationResources]);

  useEffect(() => {
    stopValidationResources();
    if (building || !state.value.trim()) return;
    const value = state.value;
    const timeoutId = window.setTimeout(() => {
      if (validationTimeoutRef.current !== timeoutId) return;
      validationTimeoutRef.current = null;
      beginValidation(value);
    }, SAN_VALIDATION_DEBOUNCE_MS);
    validationTimeoutRef.current = timeoutId;
    return () => {
      window.clearTimeout(timeoutId);
      if (validationTimeoutRef.current === timeoutId) validationTimeoutRef.current = null;
    };
  }, [beginValidation, building, state.value, stopValidationResources]);

  useEffect(() => () => stopValidationResources(), [stopValidationResources]);

  const acceptInput = (result: SanInputResult, action: "edit" | "replace") => {
    if (!result.accepted) {
      stopValidationResources();
      dispatch({ type: "input-rejected", error: result.error });
      return false;
    }
    dispatch({ type: action, value: result.value });
    return true;
  };

  const editInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    acceptInput(acceptSanInput(event.target.value), "edit");
  };

  const pasteClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      acceptInput(acceptSanInput(clipboardText), "replace");
      setClipboardError(false);
    } catch {
      setClipboardError(true);
      textareaRef.current?.focus();
    }
  };

  const cancelValidation = () => {
    const requestId = state.validationRequestId;
    stopValidationResources();
    if (requestId !== null) dispatch({ type: "validation-cancelled", requestId });
  };

  const dirty = state.value !== state.checkedValue;
  const startResult = dirty ? null : state.fromStart;
  const selectedResult = dirty ? null : state.fromSelected;
  const validating = state.validationStatus === "validating";
  const validationFailure = state.validationFailure === "worker-unavailable"
    ? text.workerUnavailable
    : state.validationFailure === "validation-failed"
      ? text.sanValidationFailed
      : "";

  return (
    <div
      className="settings-backdrop"
      data-modal-root
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="settings-dialog san-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="san-title"
        aria-describedby="san-description"
        tabIndex={-1}
      >
        <div className="settings-head">
          <div>
            <h2 id="san-title">{text.pasteSan}</h2>
            <p id="san-description">{text.pasteSanDescription}</p>
          </div>
          <button className="settings-close" type="button" onClick={onClose} aria-label={text.closeSan}>×</button>
        </div>
        <div className="san-body">
          <label className="san-input-label" htmlFor="san-input">{text.sanMoves}</label>
          <textarea
            ref={textareaRef}
            id="san-input"
            value={state.value}
            maxLength={DEFAULT_INPUT_LIMITS.maxSanCharacters}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5"
            onChange={editInput}
            disabled={building}
            spellCheck={false}
          />
          <div className="san-actions-top">
            <button className="button" type="button" onClick={pasteClipboard} disabled={building}>⌘ {text.pasteClipboard}</button>
            <button
              className="button primary"
              type="button"
              onClick={() => beginValidation(state.value)}
              disabled={building || validating || !state.value.trim() || (!dirty && Boolean(startResult))}
            >
              {text.checkSan}
            </button>
          </div>
          {clipboardError && <p className="san-message error" role="status">{text.clipboardFailed}</p>}
          {state.inputLimit && (
            <p className="san-message error" role="status">
              {importErrorMessage(locale, state.inputLimit)}
            </p>
          )}
          {validating && !building && (
            <div className="san-validation valid" role="status">
              <strong>{importProgressLabel(locale, "validating", state.validationProgress)}</strong>
              <progress className="san-build-progress" max="100" value={state.validationProgress} />
              <button className="button" type="button" onClick={cancelValidation}>{text.cancelValidation}</button>
            </div>
          )}
          {state.validationStatus === "cancelled" && (
            <p className="san-message" role="status">{text.validationCancelled}</p>
          )}
          {validationFailure && <p className="san-message error" role="alert">{validationFailure}</p>}
          {startResult && <ValidationSummary result={startResult} locale={locale} label={text.newTree} />}
          {selectedResult && (
            !selectedIsStandardRoot
            || (!selectedResult.valid && selectedResult.errorCode === "start-position-mismatch")
          ) && (
            <ValidationSummary result={selectedResult} locale={locale} label={`${text.addFromHere}: ${selectedLabel}`} />
          )}
          {building && (
            <div className="san-validation valid" role="status">
              <strong>{importProgressLabel(locale, buildProgress.stage, buildProgress.percent)}</strong>
              <progress className="san-build-progress" max="100" value={buildProgress.percent} />
            </div>
          )}
          {buildError && <p className="san-message error" role="status">{buildError}</p>}
        </div>
        <div className="settings-footer san-footer">
          {building ? (
            <button ref={buildCancelRef} className="button" type="button" onClick={onCancelBuild}>{text.cancelImport}</button>
          ) : (
            <>
              <button className="button" type="button" disabled={!startResult?.valid} onClick={() => startResult?.valid && onReplace(startResult.lines, startResult.startFen)}>{text.newTree}</button>
              <button className="button primary" type="button" disabled={!selectedResult?.valid} onClick={() => selectedResult?.valid && onAdd(selectedResult.lines)}>{text.addFromHere}</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ValidationSummary({ result, locale, label }: { result: SanValidationResult; locale: Locale; label: string }) {
  const text = messages[locale];
  if (!result.valid) {
    const errorMessage = result.errorCode === "input-limit" && result.inputLimit
      ? importErrorMessage(locale, result.inputLimit)
      : result.errorCode === "invalid-fen"
        ? text.invalidFen
        : result.errorCode === "unsafe-integer"
          ? text.unsafePosition
          : result.errorCode === "start-position-mismatch"
            ? text.startPositionMismatch
            : result.invalidToken
              ? `${text.invalidSanMove} ${result.tokenNumber}: “${result.invalidToken}”`
              : text.emptySan;
    return (
      <div className="san-validation invalid" role="status">
        <strong>{label}</strong>
        <span>{errorMessage}</span>
        {result.moves.length > 0 && <small>{text.validUntil}: {result.moves.join(" ")}</small>}
      </div>
    );
  }
  return (
    <div className="san-validation valid" role="status">
      <strong>✓ {label}</strong>
      <span>{result.moves.length} {text.validSanMoves} · {result.lines.length} {text.treeLines}</span>
      <small>{result.moves.join(" ")}</small>
    </div>
  );
}
