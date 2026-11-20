import type { Collection, Db } from "mongodb";
import type { FeaturedStore } from "./featuredStore.js";

interface SettingsDoc {
  _id: string;
  productIds: string[];
  updatedAt: Date;
}

const FEATURED_KEY = "featured-products";

export class MongoFeaturedStore implements FeaturedStore {
  private readonly settings: Collection<SettingsDoc>;

  constructor(db: Db) {
    this.settings = db.collection<SettingsDoc>("settings");
  }

  async getIds(): Promise<string[]> {
    const doc = await this.settings.findOne({ _id: FEATURED_KEY });
    return doc?.productIds ?? [];
  }

  async setIds(ids: string[]): Promise<void> {
    await this.settings.updateOne(
      { _id: FEATURED_KEY },
      { $set: { productIds: ids, updatedAt: new Date() } },
      { upsert: true },
    );
  }
}
