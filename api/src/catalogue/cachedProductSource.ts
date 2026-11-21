import type { Product } from "../domain/product.js";
import type { ProductSource } from "./productSource.js";

/**
 * Wraps any source with a short in-memory cache.
 * - Fresh: serve from memory, no upstream call.
 * - Expired: refetch; if that fails, keep serving the last good copy and wait
 *   `retryAfterMs` before trying the source again, so an outage does not make
 *   every request sit through the upstream timeout.
 * - Nothing cached yet and the source fails: the error is passed on, and for
 *   `retryAfterMs` further calls fail at once with the same error instead of
 *   each waiting out the upstream timeout.
 * - Concurrent callers share one in-flight request.
 *
 * In-memory is fine for one container. With several instances this would move
 * to a shared cache behind the same interface.
 */
export class CachedProductSource implements ProductSource {
  private cached?: { products: Product[]; expiresAt: number };
  private inFlight?: Promise<Product[]>;
  private failed?: { error: unknown; until: number };

  constructor(
    private readonly inner: ProductSource,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
    private readonly onStaleServed: (error: unknown) => void = () => {},
    private readonly retryAfterMs = 30_000,
  ) {}

  async getAll(): Promise<Product[]> {
    if (this.cached && this.now() < this.cached.expiresAt) {
      return this.cached.products;
    }
    if (!this.cached && this.failed && this.now() < this.failed.until) {
      throw this.failed.error;
    }
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<Product[]> {
    try {
      const products = await this.inner.getAll();
      this.cached = { products, expiresAt: this.now() + this.ttlMs };
      this.failed = undefined;
      return products;
    } catch (error) {
      if (this.cached) {
        this.onStaleServed(error);
        this.cached.expiresAt = this.now() + Math.min(this.retryAfterMs, this.ttlMs || this.retryAfterMs);
        return this.cached.products;
      }
      this.failed = { error, until: this.now() + this.retryAfterMs };
      throw error;
    }
  }
}
