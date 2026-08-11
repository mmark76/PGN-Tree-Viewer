import type { SanValidationResult } from "./sanParser";
import type { SanInputLimitDetails } from "./sanInput";

export type SanValidationStatus = "idle" | "scheduled" | "validating" | "cancelled" | "error";
export type SanValidationFailure = "worker-unavailable" | "validation-failed";

export type SanPasteState = {
  value: string;
  checkedValue: string;
  fromStart: SanValidationResult | null;
  fromSelected: SanValidationResult | null;
  validationStatus: SanValidationStatus;
  validationRequestId: number | null;
  validationProgress: number;
  validationFailure: SanValidationFailure | null;
  inputLimit: SanInputLimitDetails | null;
};

export type SanPasteAction =
  | { type: "edit"; value: string }
  | { type: "replace"; value: string }
  | { type: "input-rejected"; error: SanInputLimitDetails }
  | { type: "validation-started"; requestId: number; value: string }
  | { type: "validation-progress"; requestId: number; percent: number }
  | {
      type: "validated";
      requestId: number;
      value: string;
      fromStart: SanValidationResult;
      fromSelected: SanValidationResult;
    }
  | {
      type: "validation-failed";
      requestId: number;
      value: string;
      failure: SanValidationFailure;
    }
  | { type: "validation-cancelled"; requestId: number };

export const createSanPasteState = (): SanPasteState => ({
  value: "",
  checkedValue: "",
  fromStart: null,
  fromSelected: null,
  validationStatus: "idle",
  validationRequestId: null,
  validationProgress: 0,
  validationFailure: null,
  inputLimit: null,
});

export function sanPasteReducer(state: SanPasteState, action: SanPasteAction): SanPasteState {
  if (action.type === "edit") {
    return {
      ...state,
      value: action.value,
      validationStatus: action.value.trim() ? "scheduled" : "idle",
      validationRequestId: null,
      validationProgress: 0,
      validationFailure: null,
      inputLimit: null,
    };
  }
  if (action.type === "replace") {
    return {
      value: action.value,
      checkedValue: "",
      fromStart: null,
      fromSelected: null,
      validationStatus: action.value.trim() ? "scheduled" : "idle",
      validationRequestId: null,
      validationProgress: 0,
      validationFailure: null,
      inputLimit: null,
    };
  }
  if (action.type === "input-rejected") {
    return {
      ...state,
      validationStatus: "idle",
      validationRequestId: null,
      validationProgress: 0,
      validationFailure: null,
      inputLimit: action.error,
    };
  }
  if (action.type === "validation-started") {
    if (action.value !== state.value) return state;
    return {
      ...state,
      validationStatus: "validating",
      validationRequestId: action.requestId,
      validationProgress: 0,
      validationFailure: null,
    };
  }
  if (action.type === "validation-progress") {
    if (action.requestId !== state.validationRequestId) return state;
    return {
      ...state,
      validationProgress: Math.max(state.validationProgress, Math.min(100, action.percent)),
    };
  }
  if (action.type === "validation-failed") {
    if (action.requestId !== state.validationRequestId || action.value !== state.value) return state;
    return {
      ...state,
      validationStatus: "error",
      validationRequestId: null,
      validationProgress: 0,
      validationFailure: action.failure,
    };
  }
  if (action.type === "validation-cancelled") {
    if (action.requestId !== state.validationRequestId) return state;
    return {
      ...state,
      validationStatus: "cancelled",
      validationRequestId: null,
      validationProgress: 0,
      validationFailure: null,
    };
  }
  if (action.requestId !== state.validationRequestId || action.value !== state.value) return state;
  return {
    ...state,
    checkedValue: action.value,
    fromStart: action.fromStart,
    fromSelected: action.fromSelected,
    validationStatus: "idle",
    validationRequestId: null,
    validationProgress: 100,
    validationFailure: null,
    inputLimit: null,
  };
}
