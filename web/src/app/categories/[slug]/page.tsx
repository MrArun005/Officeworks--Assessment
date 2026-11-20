import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductGrid";
import { ScrollRegion } from "@/components/ScrollRegion";
import { ViewToggle } from "@/components/ViewToggle";
import { getCategoryListing } from "@/lib/api";
import { formatCategoryName } from "@/lib/format";

type Params = Promise<{ slug: string }>;

/** The page title and the page body share one API call per request. */
const loadListing = cache(getCategoryListing);

/** Each category gets its own title, which is also what the route announcer reads. */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await loadListing(slug);
  return { title: formatCategoryName(category.name) };
}

async function CategoryContent({ params }: { params: Params }) {
  const { slug } = await params;
  const { category, topRated, others } = await loadListing(slug);
  const hasOthers = others.length > 0;

  return (
    <div className="category">
      <header className="hero">
        <h1 className="hero__title">{formatCategoryName(category.name)}</h1>
        <ViewToggle />
      </header>

      {/* Large view: top rated fills the screen, the rest is a compact list
          beside it, and each scrolls on its own. Grid view: one grid, top
          rated first with a badge, scrolling together. Which product goes
          where is the API's call in both. */}
      <ScrollRegion
        className="category__body"
        label="Products in this category"
        when="grid"
      >
        <div
          className={
            hasOthers
              ? "category__sections category__sections--split"
              : "category__sections"
          }
        >
          <section aria-labelledby="top-rated-heading">
            <h2 id="top-rated-heading">Top rated</h2>
            <ProductGrid
              products={topRated}
              layout="row"
              label="Top rated products"
              scrolls="large"
              badge="Top rated"
            />
          </section>

          {hasOthers && (
            <section aria-labelledby="more-heading">
              <h2 id="more-heading">More in this category</h2>
              <ProductGrid
                products={others}
                layout="list"
                label="More products in this category"
                scrolls="large"
              />
            </section>
          )}
        </div>
      </ScrollRegion>
    </div>
  );
}

export default function CategoryPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="category">
          <ProductGridSkeleton count={4} layout="row" />
        </div>
      }
    >
      <CategoryContent params={params} />
    </Suspense>
  );
}
