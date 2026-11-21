/**
 * Chooses the "top rated" products shown on the home page.
 *
 *   npm run featured:set -- 3 5 11 12 18
 *
 * A command instead of an admin screen: the PoC has no login, and an
 * unauthenticated "change the home page" endpoint would be a security hole.
 */
import { MongoClient } from "mongodb";
import { buildProductSource } from "../composition.js";
import { loadConfig } from "../config.js";
import { MongoFeaturedStore } from "../featured/mongoFeaturedStore.js";
import { validateFeaturedIds } from "../featured/validateFeaturedIds.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const products = await buildProductSource(config).getAll();
  const ids = validateFeaturedIds(process.argv.slice(2), products);

  const mongo = new MongoClient(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await mongo.connect();
    await new MongoFeaturedStore(mongo.db(config.MONGODB_DB)).setIds(ids);
    console.info(`Featured products set to: ${ids.join(", ")}`);
  } finally {
    await mongo.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  // Not process.exit(): let open network handles close on their own.
  process.exitCode = 1;
}
