import type { Product } from "../domain/product.js";
import { UpstreamError } from "../errors.js";
import { mapFakeStoreProducts } from "./fakeStoreMapper.js";
import type { ProductSource } from "./productSource.js";

export class FakeStoreProductSource implements ProductSource {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly timeoutMs = 5000,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly warn: (message: string) => void = console.warn,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async getAll(): Promise<Product[]> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/products`, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { accept: "application/json" },
      });
    } catch (cause) {
      throw new UpstreamError("Product source could not be reached", { cause });
    }
    if (!response.ok) {
      throw new UpstreamError(`Product source responded with ${response.status}`);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new UpstreamError("Product source returned invalid JSON", { cause });
    }
    return mapFakeStoreProducts(payload, (item, error) => {
      const id = (item as { id?: unknown } | null)?.id;
      this.warn(`Skipped an invalid product from the source (id ${String(id)}): ${error.message}`);
    });
  }
}
