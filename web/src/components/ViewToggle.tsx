"use client";

import { setView, useView, type View } from "@/lib/view";

const options: { view: View; label: string; icon: React.ReactNode }[] = [
  {
    view: "large",
    label: "Large tiles",
    icon: (
      <>
        <rect x="1" y="2" width="6" height="12" />
        <rect x="9" y="2" width="6" height="12" />
      </>
    ),
  },
  {
    view: "grid",
    label: "Grid, four across",
    icon: (
      <>
        <rect x="1" y="2" width="2.5" height="5" />
        <rect x="4.83" y="2" width="2.5" height="5" />
        <rect x="8.67" y="2" width="2.5" height="5" />
        <rect x="12.5" y="2" width="2.5" height="5" />
        <rect x="1" y="9" width="2.5" height="5" />
        <rect x="4.83" y="9" width="2.5" height="5" />
        <rect x="8.67" y="9" width="2.5" height="5" />
        <rect x="12.5" y="9" width="2.5" height="5" />
      </>
    ),
  },
];

/**
 * Two buttons that switch how product lists are laid out. Shown only on
 * screens wide enough for the choice to mean something (globals.css).
 */
export function ViewToggle() {
  const current = useView();

  return (
    <div className="view-toggle" role="group" aria-label="Product view">
      {options.map(({ view, label, icon }) => (
        <button
          key={view}
          type="button"
          className="view-toggle__button"
          aria-pressed={current === view}
          aria-label={label}
          title={label}
          onClick={() => setView(view)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
            {icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
