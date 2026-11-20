import type { Product } from "../domain/product.js";

/**
 * The seam for "the product data source is expected to change".
 *
 * One method on purpose: with a 20-item catalogue the service filters in
 * memory. When a real source arrives with thousands of products, this grows
 * query methods (search, by category, paging) and the service delegates.
 */
export interface ProductSource {
  getAll(): Promise<Product[]>;
}
