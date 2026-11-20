/**
 * The visitor's two remembered preferences, and the script that applies them
 * before the first paint. This file has no "use client" on purpose: the
 * layout is rendered on the server and needs the script as plain text.
 *
 *   data-view   how product lists are laid out   (lib/view.ts)
 *   data-theme  light or dark                    (lib/theme.ts)
 */
export const VIEW_KEY = "catalogue-view";
export const VIEW_ATTRIBUTE = "data-view";
export const THEME_KEY = "catalogue-theme";
export const THEME_ATTRIBUTE = "data-theme";

/**
 * Runs in <head> before anything is painted, so a returning visitor never
 * sees the default flash first. Only known values are applied. Pattern from
 * the bundled Next.js guide: guides/preventing-flash-before-hydration.md.
 */
export const HEAD_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage,v=s.getItem("${VIEW_KEY}"),t=s.getItem("${THEME_KEY}");if(v==="grid")d.setAttribute("${VIEW_ATTRIBUTE}",v);if(t==="light"||t==="dark")d.setAttribute("${THEME_ATTRIBUTE}",t)}catch(e){}})()`;
