import type { SanValidationResult } from "./sanParser";

export type SanPasteState = {
  value: string;
  checkedValue: string;
  fromStart: SanValidationResult | null;
  fromSelected: SanValidationResult | null;
};

export type SanPasteAction =
  | { type: "edit"; value: string }
  | { type: "replace"; value: string }
  | {
      type: "validated";
      fromStart: SanValidationResult;
      fromSelected: SanValidationResult;
    };

export const createSanPasteState = (): SanPasteState => ({
  value: "",
  checkedValue: "",
  fromStart: null,
  fromSelected: null,
});

export function sanPasteReducer(state: SanPasteState, action: SanPasteAction): SanPasteState {
  if (action.type === "edit") return { ...state, value: action.value };
  if (action.type === "replace") {
    return {
      value: action.value,
      checkedValue: "",
      fromStart: null,
      fromSelected: null,
    };
  }
  return {
    ...state,
    checkedValue: state.value,
    fromStart: action.fromStart,
    fromSelected: action.fromSelected,
  };
}
