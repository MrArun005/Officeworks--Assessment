"use client";

import { useSyncExternalStore } from "react";
import { VIEW_ATTRIBUTE as ATTRIBUTE, VIEW_KEY as STORAGE_KEY } from "./headScript";

/**
 * How product lists are shown on a wide screen:
 *   large: big tiles sharing the screen (the default).
 *   grid:  four across, two rows to a screen.
 *
 * The choice is a visitor's preference, not catalogue data, so it never goes
 * to the API. It lives in an attribute on <html> (the CSS in globals.css
 * does the rest) and is remembered in the browser; lib/headScript.ts puts it
 * back before the first paint.
 */
export type View = "large" | "grid";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentView(): View {
  return document.documentElement.getAttribute(ATTRIBUTE) === "grid" ? "grid" : "large";
}

export function setView(view: View) {
  document.documentElement.setAttribute(ATTRIBUTE, view);
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Private windows may refuse storage; the choice still holds for this visit.
  }
  listeners.forEach((listener) => listener());
}

/** The server always renders the default; the browser corrects it on arrival. */
export function useView(): View {
  return useSyncExternalStore(subscribe, currentView, () => "large");
}
