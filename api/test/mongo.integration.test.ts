/**
 * The two Mongo classes against a real MongoDB. Skipped unless
 * MONGODB_TEST_URI is set, so `npm test` still needs no infrastructure:
 *
 *   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npx vitest run
 *
 * Each run uses its own throwaway database and drops it at the end.
 */
import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoEnquiryRepository } from "../src/enquiries/mongoEnquiryRepository.js";
import { MongoFeaturedStore } from "../src/featured/mongoFeaturedStore.js";

const uri = process.env.MONGODB_TEST_URI;
const describeWithMongo = uri ? describe : describe.skip;
const title = uri
  ? "MongoDB classes against a real database"
  : "MongoDB classes (skipped: set MONGODB_TEST_URI to run)";

describeWithMongo(title, () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = new MongoClient(uri ?? "", { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(`catalogue-test-${randomUUID()}`);
  });

  afterAll(async () => {
    await db?.dropDatabase();
    await client?.close();
  });

  describe("MongoEnquiryRepository", () => {
    const enquiry = {
      productId: "3",
      productTitle: "Cotton Jacket",
      name: "Asha Rao",
      email: "asha@example.test",
      emailStatus: "pending" as const,
      createdAt: new Date("2026-11-20T09:00:00Z"),
    };

    it("saves an enquiry and returns its new id", async () => {
      const saved = await new MongoEnquiryRepository(db).create(enquiry);

      expect(saved).toMatchObject(enquiry);
      expect(ObjectId.isValid(saved.id)).toBe(true);
      const doc = await db.collection("enquiries").findOne({ _id: new ObjectId(saved.id) });
      expect(doc).toMatchObject({ name: "Asha Rao", emailStatus: "pending" });
    });

    it("updates the email status of a saved enquiry", async () => {
      const repository = new MongoEnquiryRepository(db);
      const saved = await repository.create(enquiry);

      await repository.setEmailStatus(saved.id, "sent");

      const doc = await db.collection("enquiries").findOne({ _id: new ObjectId(saved.id) });
      expect(doc?.emailStatus).toBe("sent");
    });
  });

  describe("MongoFeaturedStore", () => {
    it("returns no ids before anything is chosen, then the chosen ids in order", async () => {
      const store = new MongoFeaturedStore(db);
      expect(await store.getIds()).toEqual([]);

      await store.setIds(["7", "3", "1", "12", "5"]);
      expect(await store.getIds()).toEqual(["7", "3", "1", "12", "5"]);

      await store.setIds(["2", "4", "6", "8", "10"]);
      expect(await store.getIds()).toEqual(["2", "4", "6", "8", "10"]);
    });
  });
});
