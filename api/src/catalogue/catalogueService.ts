import { byRatingDesc, type Category, type Product } from "../domain/product.js";
import { NotFoundError } from "../errors.js";
import type { FeaturedStore } from "../featured/featuredStore.js";
import { withTimeout } from "../timeout.js";
import type { ProductSource } from "./productSource.js";

export const FEATURED_COUNT = 5;
export const CATEGORY_TOP_RATED_COUNT = 3;

/**
 * How long the home page waits for the owner's choice. The database driver
 * would otherwise wait about 5 s to find a server when MongoDB is down; best
 * rated is a fine answer much sooner than that.
 */
const DEFAULT_FEATURED_TIMEOUT_MS = 1000;

export interface CatalogueOptions {
  featuredTimeoutMs?: number;
}

export interface CategoryListing {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface CatalogueLogger {
  warn(message: string, error?: unknown): void;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Curly apostrophes become straight ones, on both the term and the product
 * text: phones and word processors type "men’s", Fake Store writes "men's",
 * and a customer should not have to know which.
 */
function normaliseApostrophes(text: string): string {
  return text.replace(/[‘’]/g, "'");
}

/** All catalogue rules live here; it knows nothing about HTTP or Fake Store. */
export class CatalogueService {
  constructor(
    private readonly source: ProductSource,
    private readonly featured: FeaturedStore,
    private readonly log: CatalogueLogger = console,
    private readonly options: CatalogueOptions = {},
  ) {}

  async listCategories(): Promise<Category[]> {
    const products = await this.source.getAll();
    const bySlug = new Map<string, Category>();
    for (const p of products) bySlug.set(p.category.slug, p.category);
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * The owner's chosen products, in their order. Ids the source no longer has
   * are skipped (with a warning), and gaps are filled with the best rated
   * products, so the home page always shows five (or everything, if the
   * catalogue is smaller). If the choice cannot be read at all, or not within
   * the timeout, the home page falls back to best rated rather than failing.
   */
  async getFeatured(): Promise<Product[]> {
    const [products, chosenIds] = await Promise.all([
      this.source.getAll(),
      withTimeout(
        this.featured.getIds(),
        this.options.featuredTimeoutMs ?? DEFAULT_FEATURED_TIMEOUT_MS,
        "Reading the featured products",
      ).catch((error: unknown) => {
        this.log.warn("Could not read the featured products; showing best rated", error);
        return [] as string[];
      }),
    ]);

    const byId = new Map(products.map((p) => [p.id, p]));
    const picked: Product[] = [];
    const pickedIds = new Set<string>();
    for (const id of chosenIds) {
      const product = byId.get(id);
      if (!product) {
        this.log.warn(`Featured product "${id}" is no longer in the catalogue; skipped`);
        continue;
      }
      if (pickedIds.has(id)) continue;
      picked.push(product);
      pickedIds.add(id);
    }

    for (const product of [...products].sort(byRatingDesc)) {
      if (picked.length >= FEATURED_COUNT) break;
      if (pickedIds.has(product.id)) continue;
      picked.push(product);
      pickedIds.add(product.id);
    }
    return picked.slice(0, FEATURED_COUNT);
  }

  async getCategoryListing(slug: string): Promise<CategoryListing> {
    const products = await this.source.getAll();
    const inCategory = products
      .filter((p) => p.category.slug === slug)
      .sort(byRatingDesc);
    const first = inCategory[0];
    if (!first) throw new NotFoundError(`Category "${slug}" was not found`);
    return {
      category: first.category,
      topRated: inCategory.slice(0, CATEGORY_TOP_RATED_COUNT),
      others: inCategory.slice(CATEGORY_TOP_RATED_COUNT),
    };
  }

  /**
   * Every word of the term must match the start of a word in the title,
   * description or category name, ignoring case. So "jack" finds "Jacket",
   * but "men" does not find "women's". A curly apostrophe matches a straight one.
   */
  async search(term: string): Promise<Product[]> {
    const patterns = normaliseApostrophes(term)
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(word)}`, "u"));
    if (patterns.length === 0) return [];
    const products = await this.source.getAll();
    return products.filter((p) => {
      const text = normaliseApostrophes(
        `${p.title} ${p.description} ${p.category.name}`,
      ).toLowerCase();
      return patterns.every((pattern) => pattern.test(text));
    });
  }

  async getProduct(id: string): Promise<Product> {
    const products = await this.source.getAll();
    const product = products.find((p) => p.id === id);
    if (!product) throw new NotFoundError(`Product "${id}" was not found`);
    return product;
  }
}
