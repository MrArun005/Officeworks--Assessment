import { describe, expect, it } from "vitest";
import { CachedProductSource } from "../src/catalogue/cachedProductSource.js";
import { FakeStoreProductSource } from "../src/catalogue/fakeStoreProductSource.js";
import { FallbackProductSource } from "../src/catalogue/fallbackProductSource.js";
import { FixtureProductSource } from "../src/catalogue/fixtureProductSource.js";
import { buildProductSource } from "../src/composition.js";
import { loadConfig } from "../src/config.js";
import { UpstreamError } from "../src/errors.js";
import { product, StubProductSource } from "./helpers.js";

const fakeStoreItem = {
  id: 7,
  title: "White Gold Plated Princess",
  description: "Classic ring",
  price: 9.99,
  category: "men's clothing",
  image: "https://fakestoreapi.com/img/7.png",
  rating: { rate: 3, count: 400 },
};

const fetchReturning = (body: unknown, status = 200): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe("FakeStoreProductSource", () => {
  it("maps the upstream shape into the catalogue's own product shape", async () => {
    const source = new FakeStoreProductSource("https://upstream.test", 1000, fetchReturning([fakeStoreItem]));
    expect(await source.getAll()).toEqual([
      {
        id: "7",
        title: "White Gold Plated Princess",
        description: "Classic ring",
        price: 9.99,
        currency: "USD",
        category: { slug: "mens-clothing", name: "men's clothing" },
        imageUrl: "https://fakestoreapi.com/img/7.png",
        rating: { average: 3, count: 400 },
      },
    ]);
  });

  it("requests the products endpoint of the configured base URL", async () => {
    let requested = "";
    const fetchFn = (async (url: string | URL | Request) => {
      requested = String(url);
      return new Response(JSON.stringify([fakeStoreItem]));
    }) as typeof fetch;
    await new FakeStoreProductSource("https://upstream.test", 1000, fetchFn).getAll();
    expect(requested).toBe("https://upstream.test/products");
  });

  it("drops one malformed item and reports it, instead of failing the whole catalogue", async () => {
    const warnings: string[] = [];
    const source = new FakeStoreProductSource(
      "https://upstream.test",
      1000,
      fetchReturning([fakeStoreItem, { ...fakeStoreItem, id: 8, image: "javascript:alert(1)" }]),
      (message) => void warnings.push(message),
    );
    expect((await source.getAll()).map((p) => p.id)).toEqual(["7"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("id 8");
  });

  it("fails with an upstream error when no item is usable", async () => {
    const source = new FakeStoreProductSource(
      "https://upstream.test",
      1000,
      fetchReturning([{ id: "x" }]),
      () => {},
    );
    await expect(source.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });

  it("treats an empty list as a broken source, not as an empty shop", async () => {
    const source = new FakeStoreProductSource("https://upstream.test", 1000, fetchReturning([]));
    await expect(source.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });

  it("fails with an upstream error when the payload is not a list", async () => {
    const source = new FakeStoreProductSource("https://upstream.test", 1000, fetchReturning({ products: [] }));
    await expect(source.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });

  it("tolerates a trailing slash in the configured base URL", async () => {
    let requested = "";
    const fetchFn = (async (url: string | URL | Request) => {
      requested = String(url);
      return new Response(JSON.stringify([fakeStoreItem]));
    }) as typeof fetch;
    await new FakeStoreProductSource("https://upstream.test/", 1000, fetchFn).getAll();
    expect(requested).toBe("https://upstream.test/products");
  });

  it("fails with an upstream error on a non-2xx response", async () => {
    const source = new FakeStoreProductSource("https://upstream.test", 1000, fetchReturning({}, 503));
    await expect(source.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });

  it("fails with an upstream error when the network call throws", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const source = new FakeStoreProductSource("https://upstream.test", 1000, failing);
    await expect(source.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe("FixtureProductSource", () => {
  it("serves the bundled snapshot in the catalogue's product shape", async () => {
    const products = await new FixtureProductSource().getAll();
    expect(products).toHaveLength(20);
    expect(products[0]).toMatchObject({
      id: "1",
      currency: "USD",
      category: { slug: "mens-clothing", name: "men's clothing" },
    });
  });
});

describe("FallbackProductSource", () => {
  it("serves the primary source when it works", async () => {
    const source = new FallbackProductSource(
      new StubProductSource([product("live")]),
      new StubProductSource([product("snapshot")]),
    );
    expect((await source.getAll())[0]?.id).toBe("live");
  });

  it("serves the fallback and reports why when the primary fails", async () => {
    const primary = new StubProductSource([]);
    primary.error = new UpstreamError("down");
    const reasons: unknown[] = [];
    const source = new FallbackProductSource(
      primary,
      new StubProductSource([product("snapshot")]),
      (error) => void reasons.push(error),
    );
    expect((await source.getAll())[0]?.id).toBe("snapshot");
    expect(reasons).toEqual([primary.error]);
  });
});

describe("CachedProductSource", () => {
  function setup(ttlMs = 1000) {
    const inner = new StubProductSource([product("1")]);
    let now = 0;
    const cached = new CachedProductSource(inner, ttlMs, () => now);
    return { inner, cached, advance: (ms: number) => (now += ms) };
  }

  it("calls the source once while the cache is fresh", async () => {
    const { inner, cached, advance } = setup();
    await cached.getAll();
    advance(999);
    await cached.getAll();
    expect(inner.calls).toBe(1);
  });

  it("refetches after the time-to-live has passed", async () => {
    const { inner, cached, advance } = setup();
    await cached.getAll();
    advance(1000);
    inner.products = [product("2")];
    expect((await cached.getAll())[0]?.id).toBe("2");
    expect(inner.calls).toBe(2);
  });

  it("serves the last good copy when a refresh fails", async () => {
    const { inner, cached, advance } = setup();
    await cached.getAll();
    advance(1000);
    inner.error = new UpstreamError("down");
    expect((await cached.getAll())[0]?.id).toBe("1");
  });

  it("reports a stale serve, then waits before asking the failing source again", async () => {
    const inner = new StubProductSource([product("1")]);
    let now = 0;
    const stale: unknown[] = [];
    const cached = new CachedProductSource(inner, 1000, () => now, (e) => void stale.push(e), 200);
    await cached.getAll();

    now = 1000;
    inner.error = new UpstreamError("down");
    await cached.getAll();
    expect(inner.calls).toBe(2);
    expect(stale).toHaveLength(1);

    now = 1199;
    await cached.getAll();
    expect(inner.calls).toBe(2);

    now = 1200;
    await cached.getAll();
    expect(inner.calls).toBe(3);
  });

  it("propagates the error when there is nothing cached yet", async () => {
    const { inner, cached } = setup();
    inner.error = new UpstreamError("down");
    await expect(cached.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });

  it("with nothing cached, fails fast for a while instead of asking a failing source every time", async () => {
    const { inner, cached, advance } = setup();
    inner.error = new UpstreamError("down");

    await expect(cached.getAll()).rejects.toThrow("down");
    await expect(cached.getAll()).rejects.toThrow("down");
    expect(inner.calls).toBe(1);

    advance(30_001);
    inner.error = undefined;
    expect(await cached.getAll()).toHaveLength(1);
    expect(inner.calls).toBe(2);
  });

  it("shares one upstream call between concurrent callers", async () => {
    const { inner, cached } = setup();
    await Promise.all([cached.getAll(), cached.getAll(), cached.getAll()]);
    expect(inner.calls).toBe(1);
  });
});

describe("the product source as the app wires it", () => {
  // Cache period 0, so every call goes back to the live source.
  const config = loadConfig({ PRODUCT_CACHE_TTL_SECONDS: "0" });

  it("keeps serving the last good copy, not the snapshot, when the live source starts failing", async () => {
    const live = new StubProductSource([product("live-1")]);
    const warnings: string[] = [];
    const source = buildProductSource(config, live, (message) => warnings.push(message));

    expect((await source.getAll()).map((p) => p.id)).toEqual(["live-1"]);
    live.error = new UpstreamError("down");

    expect((await source.getAll()).map((p) => p.id)).toEqual(["live-1"]);
    expect(warnings).toEqual(["Product source failed; serving the last good copy"]);
  });

  it("serves the bundled snapshot on a first run with the live source down, without retrying on every call", async () => {
    const live = new StubProductSource([]);
    live.error = new UpstreamError("down");
    const source = buildProductSource(config, live, () => {});

    expect(await source.getAll()).toHaveLength(20);
    expect(await source.getAll()).toHaveLength(20);
    expect(live.calls).toBe(1);
  });

  it("uses the snapshot alone when configured to, and never calls the live source", async () => {
    const live = new StubProductSource([product("live-1")]);
    const source = buildProductSource(loadConfig({ PRODUCT_SOURCE: "fixture" }), live);

    expect(await source.getAll()).toHaveLength(20);
    expect(live.calls).toBe(0);
  });
});
