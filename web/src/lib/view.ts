"use client";

import { useSyncExternalStore } from "react";

/**
 * How product lists are shown on a wide screen:
 *   large: big tiles sharing the screen (the default).
 *   grid:  four across, two rows to a screen.
 *
 * The choice is a visitor's preference, not catalogue data, so it never goes
 * to the API. It lives in an attribute on <html> (the CSS in globals.css
 * does the rest) and is remembered in the browser.
 */
export type View = "large" | "grid";

const STORAGE_KEY = "catalogue-view";
const ATTRIBUTE = "data-view";

/**
 * Runs in <head> before anything is painted, so a returning visitor never
 * sees the default view flash first. Pattern from the bundled Next.js guide:
 * guides/preventing-flash-before-hydration.md ("Themes").
 */
export const VIEW_SCRIPT = `(function(){try{if(localStorage.getItem("${STORAGE_KEY}")==="grid")document.documentElement.setAttribute("${ATTRIBUTE}","grid")}catch(e){}})()`;

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
