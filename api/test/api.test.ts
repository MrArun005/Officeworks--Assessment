/**
 * The critical path end to end over HTTP: real Express app, real services,
 * in-memory fakes only at the edges (product source, database, email).
 */
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { CatalogueService } from "../src/catalogue/catalogueService.js";
import { InMemoryEnquiryRepository } from "../src/enquiries/enquiryRepository.js";
import { EnquiryService } from "../src/enquiries/enquiryService.js";
import { UpstreamError } from "../src/errors.js";
import { InMemoryFeaturedStore } from "../src/featured/featuredStore.js";
import { createApp } from "../src/http/app.js";
import { product, RecordingEmailSender, StubProductSource } from "./helpers.js";

const products = [
  product("1", { title: "Laptop Backpack", rating: { average: 3.9, count: 120 } }),
  product("2", { title: "Slim T-Shirt", rating: { average: 4.1, count: 259 }, category: "men's clothing" }),
  product("3", { title: "Cotton Jacket", rating: { average: 4.7, count: 500 }, category: "men's clothing" }),
  product("4", { title: "Gold Bracelet", rating: { average: 4.6, count: 400 }, category: "jewelery" }),
  product("5", { title: "Portable Hard Drive", rating: { average: 3.3, count: 203 } }),
  product("6", { title: "Gaming Monitor", rating: { average: 2.2, count: 140 } }),
  product("7", { title: "Solid State Drive", rating: { average: 4.8, count: 319 } }),
];

const validEnquiry = {
  productId: "3",
  name: "Asha Rao",
  email: "asha@example.test",
  phone: "+91 98765 43210",
  message: "Is this available in medium?",
};

let source: StubProductSource;
let repository: InMemoryEnquiryRepository;
let email: RecordingEmailSender;
let errors: string[];
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  source = new StubProductSource(products);
  repository = new InMemoryEnquiryRepository();
  email = new RecordingEmailSender();
  errors = [];
  const logError = (message: string) => void errors.push(message);
  const catalogue = new CatalogueService(source, new InMemoryFeaturedStore(["6", "1", "2", "3", "4"]));
  const enquiries = new EnquiryService(
    catalogue,
    repository,
    email,
    { salesInbox: "sales@shop.test", from: "catalogue@shop.test", sendTimeoutMs: 50 },
    logError,
  );
  databaseUp = true;
  app = createApp({
    catalogue,
    enquiries,
    enquiryRateLimit: 3,
    logError,
    checkReady: async () => {
      if (!databaseUp) throw new Error("database down");
    },
  });
});

let databaseUp: boolean;

const ids = (body: { id: string }[]) => body.map((p) => p.id);

describe("home page", () => {
  it("GET /api/featured-products returns the five chosen products", async () => {
    const res = await request(app).get("/api/featured-products").expect(200);
    expect(ids(res.body)).toEqual(["6", "1", "2", "3", "4"]);
  });
});

describe("category page", () => {
  it("GET /api/categories lists the categories", async () => {
    const res = await request(app).get("/api/categories").expect(200);
    expect(res.body.map((c: { slug: string }) => c.slug)).toEqual([
      "electronics",
      "jewelery",
      "mens-clothing",
    ]);
  });

  it("GET /api/categories/:slug/products returns top rated and additional products", async () => {
    const res = await request(app).get("/api/categories/electronics/products").expect(200);
    expect(res.body.category.name).toBe("electronics");
    expect(ids(res.body.topRated)).toEqual(["7", "1", "5"]);
    expect(ids(res.body.others)).toEqual(["6"]);
  });

  it("returns 404 for an unknown category", async () => {
    const res = await request(app).get("/api/categories/unknown/products").expect(404);
    expect(res.body.error.code).toBe("not_found");
  });
});

describe("search", () => {
  it("GET /api/products?search= returns only matching products", async () => {
    const res = await request(app).get("/api/products").query({ search: "drive" }).expect(200);
    expect(ids(res.body)).toEqual(["5", "7"]);
  });

  it("returns 400 when the search term is missing or blank", async () => {
    await request(app).get("/api/products").expect(400);
    const res = await request(app).get("/api/products").query({ search: "   " }).expect(400);
    expect(res.body.error.code).toBe("validation_failed");
  });

  it("explains that a search term over 100 characters is too long", async () => {
    const res = await request(app)
      .get("/api/products")
      .query({ search: "a".repeat(101) })
      .expect(400);
    // A field error, so it is in details; the top-level message stays general.
    expect(res.body.error.message).toBe("Invalid search query");
    expect(res.body.error.details).toEqual({
      search: ["Search terms are limited to 100 characters"],
    });
  });
});

describe("product page", () => {
  it("GET /api/products/:id returns the product", async () => {
    const res = await request(app).get("/api/products/3").expect(200);
    expect(res.body).toMatchObject({ id: "3", title: "Cotton Jacket" });
  });

  it("returns 404 for an unknown product", async () => {
    await request(app).get("/api/products/999").expect(404);
  });
});

describe("enquiry", () => {
  it("POST /api/enquiries saves the enquiry and emails the sales inbox", async () => {
    const res = await request(app).post("/api/enquiries").send(validEnquiry).expect(201);

    expect(repository.enquiries).toHaveLength(1);
    expect(repository.enquiries[0]).toMatchObject({
      id: res.body.id,
      productTitle: "Cotton Jacket",
      emailStatus: "sent",
    });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      to: "sales@shop.test",
      from: "catalogue@shop.test",
      replyTo: "asha@example.test",
      subject: "New enquiry: Cotton Jacket",
    });
    expect(email.sent[0]?.text).toContain("Asha Rao");
    expect(email.sent[0]?.text).toContain("Is this available in medium?");
  });

  it("accepts an enquiry without the optional phone and message", async () => {
    const { productId, name, email: address } = validEnquiry;
    await request(app).post("/api/enquiries").send({ productId, name, email: address }).expect(201);
    expect(email.sent).toHaveLength(1);
  });

  it("returns 400 with field errors and sends nothing when the input is invalid", async () => {
    const res = await request(app)
      .post("/api/enquiries")
      .send({ ...validEnquiry, name: "", email: "not-an-email" })
      .expect(400);

    expect(Object.keys(res.body.error.details).sort()).toEqual(["email", "name"]);
    expect(repository.enquiries).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects a line break in the email address, which becomes the Reply-To header", async () => {
    const res = await request(app)
      .post("/api/enquiries")
      .send({ ...validEnquiry, email: "asha@example.test\r\nBcc: attacker@evil.test" })
      .expect(400);
    expect(Object.keys(res.body.error.details)).toEqual(["email"]);
    expect(email.sent).toHaveLength(0);
  });

  it("trims the email and treats blank optional fields as not given", async () => {
    await request(app)
      .post("/api/enquiries")
      .send({ ...validEnquiry, email: "  asha@example.test ", phone: "", message: "  " })
      .expect(201);
    expect(repository.enquiries[0]).toMatchObject({ email: "asha@example.test" });
    expect(repository.enquiries[0]?.phone).toBeUndefined();
    expect(repository.enquiries[0]?.message).toBeUndefined();
  });

  it("explains a missing body instead of returning empty details", async () => {
    const res = await request(app).post("/api/enquiries").expect(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(Object.keys(res.body.error.details).sort()).toEqual(["email", "name", "productId"]);
  });

  it("still thanks the customer if the email went out but the status could not be saved", async () => {
    repository.setEmailStatus = async () => {
      throw new Error("database went away");
    };

    await request(app).post("/api/enquiries").send(validEnquiry).expect(201);

    expect(email.sent).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it("rejects line breaks in the name, which goes into the email body", async () => {
    await request(app)
      .post("/api/enquiries")
      .send({ ...validEnquiry, name: "Asha\r\nBcc: attacker@evil.test" })
      .expect(400);
    expect(email.sent).toHaveLength(0);
  });

  it("returns 404 when the product does not exist", async () => {
    await request(app).post("/api/enquiries").send({ ...validEnquiry, productId: "999" }).expect(404);
    expect(repository.enquiries).toHaveLength(0);
  });

  it("still accepts the enquiry when the email provider fails, and records the failure", async () => {
    email.error = new Error("SMTP connection refused");

    await request(app).post("/api/enquiries").send(validEnquiry).expect(201);

    expect(repository.enquiries[0]?.emailStatus).toBe("failed");
    expect(errors).toHaveLength(1);
  });

  it("does not keep the customer waiting on a mail server that never answers", async () => {
    email.send = () => new Promise<void>(() => {});

    await request(app).post("/api/enquiries").send(validEnquiry).expect(201);

    expect(repository.enquiries[0]?.emailStatus).toBe("failed");
    expect(errors).toHaveLength(1);
  });

  it("limits how many enquiries one customer address can send", async () => {
    const send = (ip: string) =>
      request(app).post("/api/enquiries").set("X-Forwarded-For", ip).send(validEnquiry);

    await send("203.0.113.5").expect(201);
    await send("203.0.113.5").expect(201);
    await send("203.0.113.5").expect(201);
    const limited = await send("203.0.113.5").expect(429);
    expect(limited.body.error.code).toBe("rate_limited");

    await send("203.0.113.99").expect(201);
  });

  it("does not count rejected enquiries towards the limit", async () => {
    const send = (body: object) =>
      request(app).post("/api/enquiries").set("X-Forwarded-For", "203.0.113.7").send(body);

    for (let i = 0; i < 5; i++) {
      await send({ ...validEnquiry, email: "not-an-email" }).expect(400);
    }
    await send(validEnquiry).expect(201);
  });
});

describe("error handling", () => {
  it("returns 502 without leaking details when the product source is down", async () => {
    source.error = new UpstreamError("Product source could not be reached", {
      cause: new Error("secret internal hostname"),
    });
    const res = await request(app).get("/api/featured-products").expect(502);
    expect(res.body).toEqual({
      error: { code: "upstream_unavailable", message: "Product source could not be reached" },
    });
  });

  it("returns 400 for a malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/enquiries")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);
    expect(res.body.error.code).toBe("bad_request");
  });

  it("returns 404 for an unknown route", async () => {
    await request(app).get("/api/nope").expect(404);
  });

  it("reports unhealthy when the database is unreachable", async () => {
    await request(app).get("/api/health").expect(200);
    databaseUp = false;
    const res = await request(app).get("/api/health").expect(503);
    expect(res.body).toEqual({ status: "unavailable" });
  });

  it("does not advertise the framework", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
