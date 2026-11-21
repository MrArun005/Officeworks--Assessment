// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getCategoryListing, getFeaturedProducts, getProduct } from "@/lib/api";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_BASE_URL", "http://api.test/");
});

afterEach(() => {
  fetchMock.mockReset();
  notFound.mockClear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api client", () => {
  it("calls our own backend, never the product source", async () => {
    fetchMock.mockResolvedValue(json([]));
    await getFeaturedProducts();
    expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/api/featured-products");
  });

  it("encodes ids and slugs taken from the URL", async () => {
    fetchMock.mockImplementation(async () => json({}));
    await getProduct("a/b?c");
    await getCategoryListing("men's clothing");
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/products/a%2Fb%3Fc",
      "http://api.test/api/categories/men's%20clothing/products",
    ]);
  });

  it("turns the API's 404 into the Next.js not-found page", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "not_found", message: "nope" } }, 404));
    await expect(getProduct("999")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("carries the API's error code and message for other failures", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: "upstream_unavailable", message: "Product source down" } }, 502),
    );
    const error = await getFeaturedProducts().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "upstream_unavailable", message: "Product source down" });
  });

  it("reports an unreachable backend as a 503 instead of a raw network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(getFeaturedProducts()).rejects.toMatchObject({ status: 503, code: "api_unreachable" });
  });
});
