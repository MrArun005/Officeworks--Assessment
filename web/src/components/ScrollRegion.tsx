"use client";

import type { ReactNode } from "react";
import { useView, type View } from "@/lib/view";

/**
 * An area that scrolls inside the page on wide screens (globals.css, FRAME).
 * A scrolling area must take keyboard focus, or a keyboard user cannot
 * scroll it; a focusable area needs a role and a name.
 *
 * Which area scrolls depends on the chosen view, so `when` says in which
 * view this one does. Outside that view it is a plain <div>.
 */
export function ScrollRegion({
  className,
  label,
  when = "always",
  children,
}: {
  className: string;
  label: string;
  when?: View | "always";
  children: ReactNode;
}) {
  const view = useView();
  const scrolls = when === "always" || when === view;

  return scrolls ? (
    <div className={className} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  ) : (
    <div className={className}>{children}</div>
  );
}
