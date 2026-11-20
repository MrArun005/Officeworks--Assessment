/**
 * The only door to product data. It runs on the Next.js server and talks to
 * our own backend; the browser never sees this URL, and nothing in the client
 * knows where the backend gets its products from.
 */
import { notFound } from "next/navigation";
import type { Category, CategoryListing, EnquiryInput, Product } from "./types";

export type FieldErrors = Record<string, string[] | undefined>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  let url = process.env.API_BASE_URL ?? "http://localhost:4000";
  while (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api${path}`, {
      ...init,
      headers: { accept: "application/json", ...init?.headers },
      signal: init?.signal ?? AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(503, "api_unreachable", "The catalogue service could not be reached");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: FieldErrors };
    } | null;
    throw new ApiError(
      response.status,
      body?.error?.code ?? "unknown_error",
      body?.error?.message ?? `Request failed with status ${response.status}`,
      body?.error?.details,
    );
  }
  return (await response.json()) as T;
}

/** Turns the API's "not found" into the Next.js 404 page. */
async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export function getCategories(): Promise<Category[]> {
  return request("/categories");
}

export function getFeaturedProducts(): Promise<Product[]> {
  return request("/featured-products");
}

export function getCategoryListing(slug: string): Promise<CategoryListing> {
  return orNotFound(request(`/categories/${encodeURIComponent(slug)}/products`));
}

export function searchProducts(term: string): Promise<Product[]> {
  return request(`/products?search=${encodeURIComponent(term)}`);
}

export function getProduct(id: string): Promise<Product> {
  return orNotFound(request(`/products/${encodeURIComponent(id)}`));
}

export function createEnquiry(
  input: EnquiryInput,
  customerIp?: string,
): Promise<{ id: string }> {
  return request("/enquiries", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Lets the API rate-limit per customer instead of per web server.
      // Only as trustworthy as the proxy in front of the web server: see
      // clientAddress() in app/actions.ts.
      ...(customerIp ? { "x-forwarded-for": customerIp } : {}),
    },
    body: JSON.stringify(input),
    // Longer than the API's cap on sending the email (6 s), so a slow mail
    // server ends in "Thank you", never in "try again" for a saved enquiry.
    signal: AbortSignal.timeout(15_000),
  });
}
