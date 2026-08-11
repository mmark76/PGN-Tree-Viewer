"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

let reducedMotionQuery: MediaQueryList | null = null;

function getReducedMotionQuery() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  reducedMotionQuery ??= window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);
  return reducedMotionQuery;
}

export function prefersReducedMotion(
  mediaQueryList: Pick<MediaQueryList, "matches"> | null = getReducedMotionQuery(),
) {
  return mediaQueryList?.matches ?? false;
}

function subscribeToReducedMotion(onChange: () => void) {
  const query = getReducedMotionQuery();
  if (!query) return () => undefined;
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return prefersReducedMotion();
}

function getServerReducedMotionSnapshot() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}
