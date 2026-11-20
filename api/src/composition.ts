import type { Db } from "mongodb";
import { CachedProductSource } from "./catalogue/cachedProductSource.js";
import { CatalogueService } from "./catalogue/catalogueService.js";
import { FakeStoreProductSource } from "./catalogue/fakeStoreProductSource.js";
import { FallbackProductSource } from "./catalogue/fallbackProductSource.js";
import { FixtureProductSource } from "./catalogue/fixtureProductSource.js";
import type { ProductSource } from "./catalogue/productSource.js";
import type { Config } from "./config.js";
import { ConsoleEmailSender, type EmailSender } from "./email/emailSender.js";
import { SmtpEmailSender } from "./email/smtpEmailSender.js";
import { EnquiryService } from "./enquiries/enquiryService.js";
import { MongoEnquiryRepository } from "./enquiries/mongoEnquiryRepository.js";
import { MongoFeaturedStore } from "./featured/mongoFeaturedStore.js";
import type { AppDependencies } from "./http/app.js";

/**
 * The one place that decides which implementation sits behind each interface.
 * Swapping the product source or email provider is a change here plus one new
 * class; nothing else in the codebase moves.
 */
export function buildProductSource(
  config: Config,
  live: ProductSource = new FakeStoreProductSource(config.FAKESTORE_BASE_URL),
  warn: (message: string, error: unknown) => void = console.warn,
): ProductSource {
  // The snapshot is already in memory, so it needs no cache.
  const snapshot = new FixtureProductSource();
  if (config.PRODUCT_SOURCE === "fixture") return snapshot;

  // The order matters. The cache wraps the live source, so when Fake Store
  // fails the customer keeps seeing the last good copy. The snapshot is the
  // last resort, for when there is no good copy yet (a first run with Fake
  // Store down). The other way round, one failed call would replace live
  // data with the snapshot for a whole cache period.
  const cached = new CachedProductSource(
    live,
    config.PRODUCT_CACHE_TTL_SECONDS * 1000,
    Date.now,
    (error) => warn("Product source failed; serving the last good copy", error),
  );
  return new FallbackProductSource(cached, snapshot, (error) =>
    warn("Product source unavailable and nothing cached; serving the bundled snapshot", error),
  );
}

export function buildEmailSender(config: Config): EmailSender {
  return config.EMAIL_PROVIDER === "console"
    ? new ConsoleEmailSender()
    : new SmtpEmailSender({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      });
}

export function buildDependencies(config: Config, db: Db): AppDependencies {
  const catalogue = new CatalogueService(
    buildProductSource(config),
    new MongoFeaturedStore(db),
  );
  const enquiries = new EnquiryService(
    catalogue,
    new MongoEnquiryRepository(db),
    buildEmailSender(config),
    { salesInbox: config.SALES_INBOX, from: config.MAIL_FROM, webUrl: config.PUBLIC_WEB_URL },
  );
  return {
    catalogue,
    enquiries,
    checkReady: async () => {
      await db.command({ ping: 1 });
    },
  };
}
