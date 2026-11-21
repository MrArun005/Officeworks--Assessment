import { describe, expect, it, vi } from "vitest";
import { CatalogueService } from "../src/catalogue/catalogueService.js";
import { NotFoundError } from "../src/errors.js";
import { InMemoryFeaturedStore } from "../src/featured/featuredStore.js";
import { product, StubProductSource } from "./helpers.js";

const rated = (id: string, average: number, count = 10, category = "electronics") =>
  product(id, { rating: { average, count }, category });

const silent = { warn: () => {} };

function service(products = defaultProducts, featuredIds: string[] = []) {
  return new CatalogueService(
    new StubProductSource(products),
    new InMemoryFeaturedStore(featuredIds),
    silent,
  );
}

const defaultProducts = [
  rated("1", 1.0),
  rated("2", 2.0),
  rated("3", 3.0),
  rated("4", 4.0),
  rated("5", 5.0),
  rated("6", 4.5),
  rated("7", 3.5, 10, "men's clothing"),
];

const ids = (products: { id: string }[]) => products.map((p) => p.id);

describe("featured products (home page)", () => {
  it("returns the five chosen products in the chosen order", async () => {
    const featured = await service(defaultProducts, ["1", "7", "2", "3", "4"]).getFeatured();
    expect(ids(featured)).toEqual(["1", "7", "2", "3", "4"]);
  });

  it("falls back to the five best rated when nothing has been chosen", async () => {
    const featured = await service().getFeatured();
    expect(ids(featured)).toEqual(["5", "6", "4", "7", "3"]);
  });

  it("skips chosen ids the source no longer has and fills the gap by rating", async () => {
    const featured = await service(defaultProducts, ["1", "gone", "2"]).getFeatured();
    expect(ids(featured)).toEqual(["1", "2", "5", "6", "4"]);
  });

  it("warns about each chosen id the catalogue no longer has", async () => {
    const warnings: string[] = [];
    const catalogue = new CatalogueService(
      new StubProductSource(defaultProducts),
      new InMemoryFeaturedStore(["1", "gone"]),
      { warn: (message) => void warnings.push(message) },
    );
    await catalogue.getFeatured();
    expect(warnings).toEqual(['Featured product "gone" is no longer in the catalogue; skipped']);
  });

  it("shows the best rated instead of failing when the choice cannot be read", async () => {
    const brokenStore = {
      getIds: async () => {
        throw new Error("database down");
      },
      setIds: async () => {},
    };
    const catalogue = new CatalogueService(new StubProductSource(defaultProducts), brokenStore, silent);
    expect(ids(await catalogue.getFeatured())).toEqual(["5", "6", "4", "7", "3"]);
  });

  it("shows the best rated quickly when the choice never arrives", async () => {
    const hangingStore = {
      getIds: () => new Promise<string[]>(() => {}),
      setIds: async () => {},
    };
    const warnings: string[] = [];
    const catalogue = new CatalogueService(
      new StubProductSource(defaultProducts),
      hangingStore,
      { warn: (message) => void warnings.push(message) },
      { featuredTimeoutMs: 50 },
    );
    const started = Date.now();
    expect(ids(await catalogue.getFeatured())).toEqual(["5", "6", "4", "7", "3"]);
    expect(Date.now() - started).toBeLessThan(1500);
    expect(warnings).toEqual(["Could not read the featured products; showing best rated"]);
  });

  it("waits about a second for the choice by default", async () => {
    vi.useFakeTimers();
    try {
      const hangingStore = {
        getIds: () => new Promise<string[]>(() => {}),
        setIds: async () => {},
      };
      const catalogue = new CatalogueService(new StubProductSource(defaultProducts), hangingStore, silent);
      let featured: { id: string }[] | undefined;
      const pending = catalogue.getFeatured().then((result) => (featured = result));

      await vi.advanceTimersByTimeAsync(999);
      expect(featured).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(ids(featured ?? [])).toEqual(["5", "6", "4", "7", "3"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not show the same product twice if the source repeats an id", async () => {
    const featured = await service([rated("1", 5), rated("1", 5), rated("2", 4)]).getFeatured();
    expect(ids(featured)).toEqual(["1", "2"]);
  });

  it("never returns more than five, even if more were chosen", async () => {
    const featured = await service(defaultProducts, ["1", "2", "3", "4", "5", "6"]).getFeatured();
    expect(featured).toHaveLength(5);
  });
});

describe("category listing", () => {
  it("splits a category into top rated and the remaining products", async () => {
    const listing = await service().getCategoryListing("electronics");
    expect(listing.category).toEqual({ slug: "electronics", name: "electronics" });
    expect(ids(listing.topRated)).toEqual(["5", "6", "4"]);
    expect(ids(listing.others)).toEqual(["3", "2", "1"]);
  });

  it("uses the number of ratings to break a tie", async () => {
    const listing = await service([rated("a", 4, 5), rated("b", 4, 50)]).getCategoryListing(
      "electronics",
    );
    expect(ids(listing.topRated)).toEqual(["b", "a"]);
  });

  it("finds a category by its URL slug", async () => {
    const listing = await service().getCategoryListing("mens-clothing");
    expect(listing.category.name).toBe("men's clothing");
    expect(ids(listing.topRated)).toEqual(["7"]);
    expect(listing.others).toEqual([]);
  });

  it("rejects an unknown category", async () => {
    await expect(service().getCategoryListing("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists each category once, sorted by name", async () => {
    expect(await service().listCategories()).toEqual([
      { slug: "electronics", name: "electronics" },
      { slug: "mens-clothing", name: "men's clothing" },
    ]);
  });
});

describe("search", () => {
  const searchable = [
    product("1", { title: "Red Cotton Jacket", description: "Warm and light" }),
    product("2", { title: "Blue Jeans", description: "Classic cotton denim" }),
    product("3", { title: "Gold Ring", description: "Shiny", category: "jewelery" }),
  ];

  it("matches text in the title, ignoring case", async () => {
    expect(ids(await service(searchable).search("JACKET"))).toEqual(["1"]);
  });

  it("matches text in the description", async () => {
    expect(ids(await service(searchable).search("cotton"))).toEqual(["1", "2"]);
  });

  it("matches the category name", async () => {
    expect(ids(await service(searchable).search("jewelery"))).toEqual(["3"]);
  });

  it("requires every word of the term to match", async () => {
    expect(ids(await service(searchable).search("cotton blue"))).toEqual(["2"]);
  });

  it("matches the start of words, so a partial word still finds the product", async () => {
    expect(ids(await service(searchable).search("jack"))).toEqual(["1"]);
  });

  it("does not match inside a word: 'men' does not find women's products", async () => {
    const clothes = [
      product("m", { title: "Mens Casual Shirt", category: "men's clothing" }),
      product("w", { title: "Womens Rain Jacket", category: "women's clothing" }),
    ];
    expect(ids(await service(clothes).search("men"))).toEqual(["m"]);
    expect(ids(await service(clothes).search("men's"))).toEqual(["m"]);
  });

  it("treats a curly apostrophe the same as a straight one", async () => {
    const clothes = [
      product("curly", { title: "Men’s Rain Jacket" }),
      product("straight", { title: "Men's Wool Coat" }),
    ];
    expect(ids(await service(clothes).search("men's rain"))).toEqual(["curly"]);
    expect(ids(await service(clothes).search("men’s wool"))).toEqual(["straight"]);
    expect(ids(await service(clothes).search("men‘s"))).toEqual(["curly", "straight"]);
  });

  it("treats regular-expression characters in the term as plain text", async () => {
    expect(await service(searchable).search(".*")).toEqual([]);
  });

  it("returns nothing when no product matches", async () => {
    expect(await service(searchable).search("spaceship")).toEqual([]);
  });
});

describe("product details", () => {
  it("returns the product by id", async () => {
    expect((await service().getProduct("3")).title).toBe("Product 3");
  });

  it("rejects an unknown product", async () => {
    await expect(service().getProduct("999")).rejects.toBeInstanceOf(NotFoundError);
  });
});
