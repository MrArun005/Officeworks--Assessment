# Instructions for AI coding agents

Read this before changing anything. `web/AGENTS.md` adds a Next.js-specific
rule and also applies inside `web/`.

## What this is

A proof-of-concept product catalogue that must grow, not be thrown away.
Three things are expected to change: the product data source, the look and
feel, and the email provider. Each has one seam. Protect the seams.

## Boundaries (do not cross)

1. `web/` never calls the Fake Store API or any product source. It calls only
   our backend, and only through `web/src/lib/api.ts`.
2. `web/` holds no business rules, no database access and no email sending.
   The API is the only authority on what is valid. The client may mirror a
   limit as a browser hint (`required`, `maxLength`) but must never be the
   only check, and shows the API's messages.
3. Only files in `api/src/catalogue/` whose name starts with `fakeStore` may
   know Fake Store's field names or response shape. Its URL is a setting
   (`config.ts`) passed in by `composition.ts`. Everything else uses `Product`
   from `api/src/domain/product.ts`, including the bundled snapshot.
4. `CatalogueService` and `EnquiryService` depend on interfaces
   (`ProductSource`, `FeaturedStore`, `EnquiryRepository`, `EmailSender`,
   `ProductLookup`),
   never on Express, MongoDB, nodemailer or `fetch`.
5. Implementations are chosen in `api/src/composition.ts` and nowhere else.
6. Colours, fonts, type sizes, letter spacing and spacing are tokens in
   `web/src/app/theme.css`. Do not write a raw colour, font or font size in a
   component or in `globals.css`.
7. The client holds no catalogue rules or product facts (counts, currency,
   category names). It shows what the API returns. (A loading placeholder
   may guess a count; real content never does.)
8. No page may assume how much data arrives. Do not lay out for "5 featured"
   or "4 categories": product areas wrap and scroll inside the page frame,
   and the category row scrolls sideways. In a window at least 1100 by
   560 pixels a listing page must not scroll as a whole at 100% zoom, and
   anything that scrolls inside a page must be reachable from the keyboard
   (`ProductGrid.tsx` shows how). Two browser tests guard this.

## How to work

- Never guess an API. For Next.js, read the guide in
  `web/node_modules/next/dist/docs/` first: this version differs from older
  ones (for example `error.tsx` receives `retry`, data reads must be cached or
  wrapped in `<Suspense>`, and visited pages stay mounted but hidden, so
  component state survives navigation unless it is reset).
- A behaviour change comes with a test. Tests must not need Docker, MongoDB,
  a mail server or the network: use the stubs in `api/test/helpers.ts` and
  the in-memory stores that sit beside their interfaces
  (`featured/featuredStore.ts`, `enquiries/enquiryRepository.ts`).
- Do not fix a dependency conflict with `--force` or `--legacy-peer-deps`.
- Do not add a dependency for something a few lines of code can do.
- No secrets in the repository. New settings go in `api/src/config.ts`,
  `docker-compose.yml` and `.env.example`, with a safe default.
- If you make an assumption or cut scope, record it in `DECISIONS.md`.

## Checks before you say "done"

```bash
(cd api && npm run typecheck && npm test && npm run build)
(cd web && npm run lint && npm run typecheck && npm test && npm run build)
```

The web build must pass with the API not running. For a change a customer
can see, look at it in light and dark, at laptop and phone size, and with
more data than Fake Store has (point `FAKESTORE_BASE_URL` at a larger sample
in the same shape). Then run the browser tests against the running stack:

```bash
docker compose up --build -d
(cd e2e && npm ci && npm run install-browser && npm test)
```

The browser tests send two enquiries per run and the API allows 20 per
address per 15 minutes, so after about ten runs in a row restart the API.
