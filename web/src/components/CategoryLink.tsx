"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A header link that tells assistive technology which category is open. */
export function CategoryLink({ href, children }: { href: string; children: ReactNode }) {
  const current = usePathname() === href;
  return (
    <Link href={href} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
