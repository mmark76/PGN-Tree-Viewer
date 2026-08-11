"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type ModalFocusOptions = {
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
};

type ModalElementSnapshot = {
  element: HTMLElement;
  ariaHidden: string | null;
  hadInertAttribute: boolean;
};

function isAvailableFocusTarget(element: HTMLElement) {
  return !element.hidden
    && !element.hasAttribute("disabled")
    && !element.closest("[hidden], [aria-hidden='true'], [inert]")
    && element.tabIndex >= 0;
}

export function getDialogFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(isAvailableFocusTarget);
}

export function trapDialogTabKey(event: KeyboardEvent, dialog: HTMLElement) {
  if (event.key !== "Tab" || event.defaultPrevented) return false;

  const focusable = getDialogFocusableElements(dialog);
  const activeElement = dialog.ownerDocument.activeElement;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!first || !last) {
    event.preventDefault();
    dialog.focus({ preventScroll: true });
    return true;
  }

  if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }

  if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }

  return false;
}

export function getModalBackgroundElements(dialog: HTMLElement): HTMLElement[] {
  const modalRoot = dialog.closest<HTMLElement>("[data-modal-root]");
  const appRoot = dialog.closest<HTMLElement>(".app-shell");
  if (!modalRoot || !appRoot) return [];

  return (Array.from(appRoot.children) as HTMLElement[])
    .filter((element) => element.nodeType === 1)
    .filter((element) => element !== modalRoot && !element.hasAttribute("data-modal-root"));
}

export function applyModalEnvironment(dialog: HTMLElement) {
  const document = dialog.ownerDocument;
  const body = document.body;
  const previousBodyOverflow = body.style.overflow;
  const backgroundSnapshots: ModalElementSnapshot[] = getModalBackgroundElements(dialog).map((element) => ({
    element,
    ariaHidden: element.getAttribute("aria-hidden"),
    hadInertAttribute: element.hasAttribute("inert"),
  }));

  body.style.overflow = "hidden";
  for (const { element } of backgroundSnapshots) {
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("inert", "");
  }

  return () => {
    body.style.overflow = previousBodyOverflow;
    for (const { element, ariaHidden, hadInertAttribute } of backgroundSnapshots) {
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);

      if (!hadInertAttribute) element.removeAttribute("inert");
    }
  };
}

export function useModalFocus({ dialogRef, initialFocusRef, onClose }: ModalFocusOptions) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const document = dialog.ownerDocument;
    const opener = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const restoreEnvironment = applyModalEnvironment(dialog);
    const requestedTarget = initialFocusRef?.current;
    const initialTarget = requestedTarget && isAvailableFocusTarget(requestedTarget)
      ? requestedTarget
      : getDialogFocusableElements(dialog)[0] ?? dialog;

    initialTarget.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      trapDialogTabKey(event, dialog);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      restoreEnvironment();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [dialogRef, initialFocusRef]);
}
