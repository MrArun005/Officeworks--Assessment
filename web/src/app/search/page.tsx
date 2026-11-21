import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductGrid";
import { ViewToggle } from "@/components/ViewToggle";
import Link from "next/link";
import { getCategories, searchProducts } from "@/lib/api";
import { formatCategoryName } from "@/lib/format";

export const metadata: Metadata = { title: "Search" };

type SearchParams = Promise<{ q?: string | string[] }>;

/** Somewhere to go when a search finds nothing, so it is never a dead end. */
async function BrowseInstead() {
  let categories;
  try {
    categories = await getCategories();
  } catch {
    return null;
  }
  return (
    <nav className="browse" aria-label="Browse by category">
      <p className="eyebrow">Browse a category instead</p>
      <ul className="chips">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link href={`/categories/${category.slug}`} className="chip">
              {formatCategoryName(category.name)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  // Same 100-character limit as the search box and the API, so a hand-edited
  // URL gets results instead of an error page.
  const term = ((Array.isArray(q) ? q[0] : q)?.trim() ?? "").slice(0, 100);

  if (!term) {
    return <p className="lead">Type a search term above to find products.</p>;
  }

  const products = await searchProducts(term);

  return (
    <>
      <p className="lead" role="status">
        {products.length === 0
          ? `No products match “${term}”.`
          : `${products.length} ${products.length === 1 ? "product matches" : "products match"} “${term}”.`}
      </p>
      {products.length === 0 ? <BrowseInstead /> : <ProductGrid products={products} layout="row" label="Search results" />}
    </>
  );
}

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="results">
      <header className="hero">
        <p className="eyebrow">Search</p>
        <h1 className="hero__title">Search results</h1>
        <ViewToggle />
      </header>
      <Suspense fallback={<ProductGridSkeleton count={4} layout="row" />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
