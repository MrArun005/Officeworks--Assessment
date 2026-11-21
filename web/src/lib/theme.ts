/**
 * Light or dark. With no choice made, the site follows the visitor's system
 * setting (theme.css). Once they use the switch, their choice is kept in an
 * attribute on <html> and remembered in the browser (lib/headScript.ts puts
 * it back before the first paint). Like the product view,
 * it is a visitor's preference and never goes to the API.
 */
import { THEME_ATTRIBUTE as ATTRIBUTE, THEME_KEY as STORAGE_KEY } from "./headScript";

export type Theme = "light" | "dark";

/** The look on screen right now: the visitor's choice, else the system's. */
export function currentTheme(): Theme {
  const chosen = document.documentElement.getAttribute(ATTRIBUTE);
  if (chosen === "light" || chosen === "dark") return chosen;
  const systemIsDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemIsDark ? "dark" : "light";
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute(ATTRIBUTE, next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private windows may refuse storage; the choice still holds for this visit.
  }
  return next;
}
