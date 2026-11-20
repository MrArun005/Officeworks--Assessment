import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
} from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import type { CatalogueService } from "../catalogue/catalogueService.js";
import { enquiryInputSchema } from "../enquiries/enquiry.js";
import type { EnquiryService } from "../enquiries/enquiryService.js";
import { AppError, NotFoundError, ValidationError } from "../errors.js";

export interface AppDependencies {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  /** Throws if a dependency the API needs (the database) is unavailable. */
  checkReady?: () => Promise<void>;
  /** Enquiries allowed per client address per 15 minutes. */
  enquiryRateLimit?: number;
  logError?: (message: string, error: unknown) => void;
}

const searchQuerySchema = z.object({
  search: z.string("Enter a search term").trim().min(1, "Enter a search term").max(100),
});

function parse<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) {
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);
    const message = formErrors[0] ? `Invalid ${what}: ${formErrors[0]}` : `Invalid ${what}`;
    throw new ValidationError(message, fieldErrors);
  }
  return parsed.data;
}

/**
 * Builds the HTTP layer from its dependencies. No database or network is
 * touched here, so tests build the same app with in-memory fakes.
 */
export function createApp(deps: AppDependencies): Express {
  const { catalogue, enquiries, logError = console.error } = deps;
  const app = express();

  // The API is meant to sit behind exactly one hop, the web server, which
  // passes on the customer's address in X-Forwarded-For. Trusting one hop
  // makes the enquiry rate limit apply per customer rather than to the web
  // server as a whole. Docker Compose publishes the API on 127.0.0.1 only, so
  // nothing outside this machine can call it directly with a forged header.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", async (_req, res) => {
    try {
      await deps.checkReady?.();
      res.json({ status: "ok" });
    } catch (error) {
      logError("Health check failed", error);
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    res.json(await catalogue.listCategories());
  });

  app.get("/api/categories/:slug/products", async (req, res) => {
    res.json(await catalogue.getCategoryListing(req.params.slug));
  });

  // Not under /api/products/: that would hide a product whose id is "featured".
  app.get("/api/featured-products", async (_req, res) => {
    res.json(await catalogue.getFeatured());
  });

  app.get("/api/products", async (req, res) => {
    const { search } = parse(searchQuerySchema, req.query, "search query");
    res.json(await catalogue.search(search));
  });

  app.get("/api/products/:id", async (req, res) => {
    res.json(await catalogue.getProduct(req.params.id));
  });

  const enquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: deps.enquiryRateLimit ?? 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: "rate_limited", message: "Too many enquiries, try again later" },
      });
    },
  });

  app.post("/api/enquiries", enquiryLimiter, async (req, res) => {
    const input = parse(enquiryInputSchema, req.body, "enquiry");
    const enquiry = await enquiries.submit(input);
    res.status(201).json({ id: enquiry.id });
  });

  const notFound: RequestHandler = (req, _res, next) => {
    next(new NotFoundError(`No route for ${req.method} ${req.path}`));
  };
  app.use(notFound);

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
      if (error.status >= 500) logError(error.message, error.cause ?? error);
      res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }
    // Body-parser errors (malformed JSON, body too large) carry a 4xx status.
    const status = (error as { status?: number }).status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      res.status(status).json({
        error: { code: "bad_request", message: "The request could not be read" },
      });
      return;
    }
    logError("Unhandled error", error);
    res.status(500).json({
      error: { code: "internal_error", message: "Something went wrong" },
    });
  };
  app.use(errorHandler);

  return app;
}
