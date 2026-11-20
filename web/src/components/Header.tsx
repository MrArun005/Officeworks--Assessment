import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { getCategories } from "@/lib/api";
import { formatCategoryName } from "@/lib/format";
import { CategoryLink } from "./CategoryLink";
import { ThemeToggle } from "./ThemeToggle";

async function CategoryLinks() {
  let categories;
  try {
    categories = await getCategories();
  } catch {
    // Navigation is a convenience: if it cannot load, the page itself still
    // renders (and shows its own error if the catalogue is really down).
    return null;
  }
  return (
    <>
      {categories.map((category) => (
        <CategoryLink key={category.slug} href={`/categories/${category.slug}`}>
          {formatCategoryName(category.name)}
        </CategoryLink>
      ))}
    </>
  );
}

export function Header() {
  return (
    <header className="header">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* One row on wide screens: brand, categories, search. On phones the
          categories drop to their own scrolling row (see globals.css). */}
      <div className="header__inner">
        <Link href="/" className="header__brand">
          Catalogue
        </Link>
        <nav className="header__nav" aria-label="Categories">
          <Suspense fallback={null}>
            <CategoryLinks />
          </Suspense>
        </nav>
        {/* A GET form: the search term lives in the URL, so results can be
            shared, bookmarked and reached with the back button. */}
        <Form action="/search" className="search" role="search">
          <label htmlFor="search-term" className="visually-hidden">
            Search products
          </label>
          <input
            id="search-term"
            name="q"
            type="search"
            placeholder="Search products"
            required
            maxLength={100}
          />
          <button type="submit" className="button">
            Search
          </button>
        </Form>
        <ThemeToggle />
      </div>
    </header>
  );
}
