import type { Product } from "../domain/product.js";
import type { ProductSource } from "./productSource.js";

/**
 * Tries the primary source; if it fails, serves the fallback instead. Used so
 * a first run still shows a catalogue when Fake Store is down or blocked,
 * rather than every page failing until it comes back.
 */
export class FallbackProductSource implements ProductSource {
  constructor(
    private readonly primary: ProductSource,
    private readonly fallback: ProductSource,
    private readonly onFallback: (error: unknown) => void = () => {},
  ) {}

  async getAll(): Promise<Product[]> {
    try {
      return await this.primary.getAll();
    } catch (error) {
      this.onFallback(error);
      return this.fallback.getAll();
    }
  }
}
