import Link from "next/link";
import { ScrollRegion } from "@/components/ScrollRegion";
import { formatCategoryName, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import type { View } from "@/lib/view";

export function Rating({ rating }: { rating: Product["rating"] }) {
  return (
    <p className="rating">
      <span className="visually-hidden">Rated </span>
      <span aria-hidden="true">★</span> {rating.average.toFixed(1)}
      <span className="rating__count"> ({rating.count} ratings)</span>
    </p>
  );
}

export function ProductCard({ product, badge }: { product: Product; badge?: string }) {
  return (
    <li>
      {/* No aria-label: a screen reader reads the card's own text, so it hears
          the category and rating a sighted customer sees. */}
      <Link href={`/products/${encodeURIComponent(product.id)}`} className="card">
        {/* Plain <img>: the image host belongs to the product source and will
            change with it, so the client must not allow-list a hostname. */}
        <span className="card__media">
          {/* Shown only where a heading cannot say it (globals.css, grid view). */}
          {badge && <span className="card__badge">{badge}</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="card__image" src={product.imageUrl} alt="" loading="lazy" />
        </span>
        <span className="card__category">{formatCategoryName(product.category.name)}</span>
        <span className="card__title">{product.title}</span>
        <div className="card__meta">
          <span className="card__price">{formatPrice(product.price, product.currency)}</span>
          <Rating rating={product.rating} />
        </div>
      </Link>
    </li>
  );
}

/**
 * Layouts only. Which products arrive, how many and in what order is the
 * API's decision.
 *   default:  a wrapping grid.
 *   row:      rows that share the height of the screen.
 *   showcase: a row; with exactly five on a tall screen, the first one large.
 *   list:     compact rows, photo on the left.
 */
export type GridLayout = "default" | "row" | "showcase" | "list";

const gridClasses: Record<GridLayout, string> = {
  default: "grid",
  row: "grid grid--row",
  showcase: "grid grid--row grid--showcase",
  list: "grid grid--list",
};

export function ProductGrid({
  products,
  layout = "default",
  label = "Products",
  scrolls = "always",
  badge,
}: {
  products: Product[];
  layout?: GridLayout;
  /** Names the scrolling area for screen readers. */
  label?: string;
  /** The view in which this list scrolls on its own (see ScrollRegion). */
  scrolls?: View | "always";
  /** A short mark on every card of this list, e.g. "Top rated". */
  badge?: string;
}) {
  const list = (
    <ul className={gridClasses[layout]}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} badge={badge} />
      ))}
    </ul>
  );

  if (layout === "default") return list;

  // On wide screens these layouts scroll inside the page (globals.css, FRAME).
  return (
    <ScrollRegion className="scroller" label={label} when={scrolls}>
      {list}
    </ScrollRegion>
  );
}

/** Shown while a product list streams in. */
export function ProductGridSkeleton({
  count = 4,
  layout = "default",
}: {
  count?: number;
  layout?: GridLayout;
}) {
  return (
    <ul className={gridClasses[layout]} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card card--skeleton" />
      ))}
    </ul>
  );
}
