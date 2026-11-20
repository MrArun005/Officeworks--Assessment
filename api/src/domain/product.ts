/**
 * The catalogue's own product shape. Every product source maps into this, so
 * nothing outside `catalogue/` knows what the upstream API looks like.
 */
export interface Category {
  /** URL-safe identifier, e.g. "mens-clothing". */
  slug: string;
  /** Display name, e.g. "men's clothing". */
  name: string;
}

export interface Product {
  /** Opaque string: a future source may not use numeric ids. */
  id: string;
  title: string;
  description: string;
  price: number;
  /** ISO 4217 code, e.g. "USD". Owned by the source, not the client. */
  currency: string;
  category: Category;
  imageUrl: string;
  rating: { average: number; count: number };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Best rated first; more ratings wins a tie; id keeps the order stable. */
export function byRatingDesc(a: Product, b: Product): number {
  return (
    b.rating.average - a.rating.average ||
    b.rating.count - a.rating.count ||
    a.id.localeCompare(b.id, "en", { numeric: true })
  );
}
