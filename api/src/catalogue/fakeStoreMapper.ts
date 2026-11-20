import { z } from "zod";
import { slugify, type Product } from "../domain/product.js";
import { UpstreamError } from "../errors.js";

/** Fake Store is an external system, so its payload is validated, not trusted. */
const fakeStoreProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string().min(1),
  image: z.url({ protocol: /^https?$/ }),
  rating: z.object({ rate: z.number(), count: z.number() }),
});

/** Fake Store has no currency field; its prices are US dollars. */
const FAKE_STORE_CURRENCY = "USD";

/**
 * One malformed item is dropped (and reported), not allowed to take the whole
 * catalogue down. A payload that is not a list, or has no usable item at all,
 * is treated as the source being broken.
 */
export function mapFakeStoreProducts(
  payload: unknown,
  onInvalidItem: (item: unknown, error: z.ZodError) => void = () => {},
): Product[] {
  if (!Array.isArray(payload)) {
    throw new UpstreamError("Product source returned an unexpected payload");
  }

  const products: Product[] = [];
  for (const item of payload) {
    const parsed = fakeStoreProductSchema.safeParse(item);
    if (!parsed.success) {
      onInvalidItem(item, parsed.error);
      continue;
    }
    const p = parsed.data;
    products.push({
      id: String(p.id),
      title: p.title,
      description: p.description,
      price: p.price,
      currency: FAKE_STORE_CURRENCY,
      category: { slug: slugify(p.category), name: p.category },
      imageUrl: p.image,
      rating: { average: p.rating.rate, count: p.rating.count },
    });
  }

  // This includes an empty list: a shop with no products at all is far more
  // likely a broken source than the truth, and it would be cached as fresh.
  if (products.length === 0) {
    throw new UpstreamError("Product source returned no usable products");
  }
  return products;
}
