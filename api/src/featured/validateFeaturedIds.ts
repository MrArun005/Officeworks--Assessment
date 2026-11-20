import { FEATURED_COUNT } from "../catalogue/catalogueService.js";
import type { Product } from "../domain/product.js";

/**
 * Checks the owner's choice before it is saved: exactly FEATURED_COUNT
 * different ids, all of them in the catalogue. Kept apart from the command so
 * the rules can be tested without a database or Fake Store. Returns the ids
 * unchanged, or throws a message the owner can act on.
 */
export function validateFeaturedIds(ids: string[], products: Product[]): string[] {
  if (ids.length !== FEATURED_COUNT || new Set(ids).size !== ids.length) {
    throw new Error(`Give exactly ${FEATURED_COUNT} different product ids`);
  }
  const known = new Set(products.map((p) => p.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown product ids: ${unknown.join(", ")}`);
  }
  return ids;
}
