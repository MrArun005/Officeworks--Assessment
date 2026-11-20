// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitEnquiry } from "@/app/actions";

// "198.51.100.7" was sent by the browser (forgeable); "203.0.113.5" was
// appended by the proxy in front of the web server.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.5" }),
}));

const fetchMock = vi.fn<typeof fetch>();

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_BASE_URL", "http://api.test");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("submitEnquiry", () => {
  it("posts the enquiry with the address the nearest proxy saw, not the forgeable one, and reports success", async () => {
    fetchMock.mockResolvedValue(json({ id: "abc" }, 201));

    const state = await submitEnquiry(
      "3",
      { status: "idle" },
      form({ name: " Asha Rao ", email: "asha@example.test", phone: "", message: "Hello" }),
    );

    expect(state).toEqual({ status: "success" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/enquiries");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "x-forwarded-for": "203.0.113.5" });
    // Blank optional fields are left out; values are trimmed.
    expect(JSON.parse(String(init?.body))).toEqual({
      productId: "3",
      name: "Asha Rao",
      email: "asha@example.test",
      message: "Hello",
    });
  });

  it("returns the backend's field errors and the typed values on a validation failure", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          error: {
            code: "validation_failed",
            message: "Invalid enquiry",
            details: { email: ["Enter a valid email address"] },
          },
        },
        400,
      ),
    );

    const state = await submitEnquiry(
      "3",
      { status: "idle" },
      form({ name: "Asha", email: "nope", phone: "", message: "" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: { email: ["Enter a valid email address"] },
      values: { name: "Asha", email: "nope", phone: "", message: "" },
    });
  });

  it("returns a friendly error, not a crash, when the backend cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const state = await submitEnquiry(
      "3",
      { status: "idle" },
      form({ name: "Asha", email: "asha@example.test", phone: "", message: "" }),
    );

    expect(state).toMatchObject({
      status: "error",
      message: "We could not send your enquiry. Please try again in a moment.",
      values: { name: "Asha" },
    });
  });
});
