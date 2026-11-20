import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { VIEW_SCRIPT } from "@/lib/view";
import "./theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Catalogue", template: "%s | Catalogue" },
  description: "Browse the catalogue and enquire about products.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The script below may set data-view before React wakes up, hence
    // suppressHydrationWarning (bundled guide: preventing-flash-before-hydration).
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: VIEW_SCRIPT }} />
      </head>
      <body>
        <Header />
        <main className="page" id="main" tabIndex={-1}>{children}</main>
        <footer className="footer">
          <div className="footer__inner">
            <p>Catalogue</p>
            <p>Interested in a product? Open it and choose Enquire.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
