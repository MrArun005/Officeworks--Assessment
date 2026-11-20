# Product Catalogue

A proof-of-concept product catalogue: customers browse top rated products,
open a category, search, view a product and send an enquiry to the sales inbox.

Built as a foundation rather than a throwaway: the product data source, the
look and feel and the email provider each sit behind one seam and can be
replaced without touching the rest. See [DECISIONS.md](DECISIONS.md) for the
reasoning and [AI_USAGE.md](AI_USAGE.md) for how AI tools were used.

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Client | React web app: Next.js 16 (App Router), TypeScript | React is the client option I know best. Next.js renders pages on the server, so the browser never needs the backend's address and search results are plain shareable URLs. |
| Backend | Node.js 24, Express 5, TypeScript | The smallest well-known HTTP layer. The interesting code is the catalogue rules, which do not depend on Express at all. |
| Database | MongoDB 7 | Holds only what the product source cannot: the owner's five chosen products and submitted enquiries. |
| Email | SMTP, caught locally by Mailpit | SMTP is spoken by nearly every provider, including Amazon SES, and Mailpit needs no account. |

Next.js is used as the **client only**. It renders pages and relays the
enquiry form. All product data, rules, storage and email live in the Express
backend. The client never calls Fake Store, and does not know which source the
products come from.

```
Browser ──> web (Next.js) ──> api (Express) ──> ProductSource ──> Fake Store API
                                   │                  └─(if down)─> bundled snapshot
                                   ├──────────> MongoDB   (featured ids, enquiries)
                                   └──────────> EmailSender ──> SMTP (Mailpit)
```

## Run it

You need Docker with Compose. Nothing else: no accounts, no keys, no `.env`.

```bash
docker compose up --build
```

The first run pulls three images and builds two, which takes a few minutes
depending on your connection. Then open:

| What | Where |
|---|---|
| The catalogue | http://localhost:3000 |
| The sales inbox (Mailpit, this machine only) | http://localhost:8025 |
| The API (this machine only) | http://localhost:4000/api/health |

Submit an enquiry from any product page, then open the sales inbox to see the
email arrive.

The look follows your system's light or dark setting until you choose one
with the switch in the header; the choice is remembered in the browser. On a laptop or monitor (a window at least 1100 by 560 pixels)
the home, category and search pages fit one screen at 100% zoom, with long
product lists scrolling inside the page. Product and enquiry pages fit from
about 600 pixels of height. Smaller windows and phones scroll normally.

On those wider screens a two-button switch beside each page heading changes
how products are laid out: large tiles (the default), or a grid of four
across with two rows to a screen. The choice is remembered in the browser.

- **A port is taken?** Copy `.env.example` to `.env` and change `WEB_PORT`,
  `MAILPIT_UI_PORT` or `API_PORT`. MongoDB and SMTP are not published, so a
  local database or mail server cannot clash.
- **Fake Store down or you are offline?** The catalogue still works: the API
  keeps serving its last good copy, or on a first run a bundled snapshot of
  the same 20 products, and logs a warning. Product photos are loaded by the
  browser from Fake Store's own host, so those will be missing until it is
  back. To never call Fake Store for data, set `PRODUCT_SOURCE=fixture`.
- **Start again from empty:** `docker compose down -v`.

### Choose the five "top rated" products

Until five are chosen, the home page shows the five best rated products. To
choose them (ids come from the product page URL):

```bash
docker compose exec api npm run featured:set -- 1 5 9 13 17
```

## Tests

Needs Node 24, the version the images use. The commands below are written
for bash (Git Bash on Windows).

```bash
(cd api && npm ci && npm test)   # 77 tests: rules, sources, cache, email, HTTP
(cd web && npm ci && npm test)   # 26 tests: API client, product grid, view switch, light/dark switch, enquiry form, server action
```

Neither needs Docker, a database, a mail server or the network: the edges are
replaced with in-memory fakes.

**Browser tests** walk the five acceptance criteria against the running stack,
including reading the email from the sales inbox, and check the two layout
promises (fits a laptop screen; nothing wider than a phone) and the light/dark
switch:

```bash
docker compose up --build -d
(cd e2e && npm ci && npm run install-browser && npm test)   # 12 tests
```

Already have Chrome or Edge? Skip the download with
`PW_CHANNEL=chrome npm test` (or `msedge`).

| Acceptance criterion | Rules and API | Browser |
|---|---|---|
| Home page shows the 5 chosen products | `api/test/catalogueService.test.ts`, `api/test/api.test.ts` (the chosen five, in order, and every fallback) | `e2e/tests/acceptance.spec.ts` (five tiles are shown; it does not set the choice) |
| Category page: top rated, then additional products | same | same |
| Search shows only matching products | same | same |
| Clicking a tile opens the product page | | same |
| Enquiry emails the sales inbox and shows "Thank you" | `api/test/api.test.ts`, `web/test/*` | same (checks the email in Mailpit) |

## Develop without rebuilding images

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo mailpit
(cd api && npm ci && npm run dev)    # http://localhost:4000, in one terminal
(cd web && npm ci && npm run dev)    # http://localhost:3000, in another
```

The dev compose file publishes MongoDB and SMTP on 127.0.0.1. The API's
defaults already point at them, and the web app defaults to
`API_BASE_URL=http://localhost:4000`.

## Where things are

```
api/src/
  domain/product.ts            the catalogue's own product shape
  catalogue/
    productSource.ts           SEAM: where products come from
    fakeStoreProductSource.ts  Fake Store implementation (+ fakeStoreMapper.ts)
    fixtureProductSource.ts    bundled snapshot, already in the catalogue's shape
    fallbackProductSource.ts   primary source, snapshot if it fails
    cachedProductSource.ts     cache + serve-stale-on-failure, wraps any source
    catalogueService.ts        the rules: featured, category split, search
  featured/                    the owner's chosen product ids (MongoDB)
  enquiries/                   validation, storage, the save-then-email flow
  enquiries/enquiryEmail.ts    what the sales email says and looks like
  email/emailSender.ts         SEAM: how email is sent
  http/app.ts                  routes, validation, error responses
  composition.ts               the one place implementations are chosen
web/src/
  lib/api.ts                   the only door to the backend (server-side)
  app/theme.css                SEAM: colour, type and spacing tokens (light and dark)
  app/globals.css              layout and components, built only from those tokens
  app/                         pages: home, category, search, product, enquire
  components/                  header, product grid (four layouts), view switch, enquiry form
  components/ThemeToggle.tsx   the light/dark switch in the header
  lib/view.ts                  the visitor's chosen view (large tiles or grid)
  lib/theme.ts                 the visitor's chosen look (light or dark)
  lib/headScript.ts            puts both choices back before the first paint
web/next.config.ts             security headers sent with every page
e2e/tests/                     the acceptance criteria in a real browser
```

## API

| Method and path | Returns |
|---|---|
| `GET /api/featured-products` | the five featured products |
| `GET /api/categories` | categories |
| `GET /api/categories/:slug/products` | `{ category, topRated, others }` |
| `GET /api/products?search=term` | matching products |
| `GET /api/products/:id` | one product |
| `POST /api/enquiries` | `201 { id }`; body `{ productId, name, email, phone?, message? }` |
| `GET /api/health` | `200` when the API and MongoDB are up, else `503` |

Errors share one shape: `{ "error": { "code", "message", "details?" } }`.
