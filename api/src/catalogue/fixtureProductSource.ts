import snapshot from "../fixtures/catalogue-products.json" with { type: "json" };
import type { Product } from "../domain/product.js";
import type { ProductSource } from "./productSource.js";

/**
 * A bundled snapshot of 20 products, stored in the catalogue's own shape with
 * no upstream mapping. It serves two purposes: the app runs offline or when
 * Fake Store is down, and it is a second, independent implementation of the
 * seam.
 */
const products: Product[] = snapshot;

export class FixtureProductSource implements ProductSource {
  async getAll(): Promise<Product[]> {
    return products;
  }
}
