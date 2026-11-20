"use client";

import { toggleTheme } from "@/lib/theme";

const LABEL = "Switch between light and dark";

/**
 * One button that flips the look. It holds no state: the look lives on
 * <html>, and the two icons are shown or hidden by CSS (globals.css), so the
 * button is right from the first paint, before React wakes up.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={LABEL}
      title={LABEL}
      onClick={() => toggleTheme()}
    >
      {/* Moon: shown in the light look. */}
      <svg className="theme-toggle__moon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M6.2 1.3a6.8 6.8 0 1 0 8.5 8.5A5.6 5.6 0 0 1 6.2 1.3Z" />
      </svg>
      {/* Sun: shown in the dark look. */}
      <svg className="theme-toggle__sun" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="3.2" />
        <path d="M7.3 0h1.4v2.6H7.3zM7.3 13.4h1.4V16H7.3zM0 7.3h2.6v1.4H0zM13.4 7.3H16v1.4h-2.6zM1.85 2.84l.99-.99 1.84 1.84-.99.99zM11.32 12.31l.99-.99 1.84 1.84-.99.99zM2.84 14.15l-.99-.99 1.84-1.84.99.99zM12.31 4.68l-.99-.99 1.84-1.84.99.99z" />
      </svg>
    </button>
  );
}
