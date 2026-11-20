import { MongoClient } from "mongodb";
import { buildDependencies } from "./composition.js";
import { loadConfig } from "./config.js";
import { createApp } from "./http/app.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const mongo = new MongoClient(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await mongo.connect();

  const app = createApp(buildDependencies(config, mongo.db(config.MONGODB_DB)));
  const server = app.listen(config.PORT, (error?: Error) => {
    if (error) {
      // Express 5 reports listen errors (e.g. port in use) here.
      console.error(`API could not listen on :${config.PORT}`, error);
      void mongo.close().finally(() => process.exit(1));
      return;
    }
    console.info(
      `API listening on :${config.PORT} (products: ${config.PRODUCT_SOURCE}, email: ${config.EMAIL_PROVIDER})`,
    );
  });

  const shutdown = (signal: string) => {
    console.info(`${signal} received, shutting down`);
    server.close(() => {
      void mongo.close().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("API failed to start", error);
  process.exit(1);
});
