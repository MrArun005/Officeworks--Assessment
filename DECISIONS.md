# Decisions and assumptions

## 1. Assumptions where the acceptance criteria were unclear

| Gap in the criteria | Assumption | Why |
|---|---|---|
| "I have chosen 5 products to be top rated": who chooses, and how? | The business owner chooses. The five ids are stored in MongoDB and set with a command (`npm run featured:set`). | "Chosen" means curated, not computed. There is no login in the PoC, so an admin screen or endpoint would let anyone change the home page. |
| What does the home page show before anything is chosen? | The five best rated products. Chosen ids the source no longer has are skipped (and logged), and the gap is filled the same way. If the choice cannot be read at all, the same fallback applies. | The home page should never be empty or broken because of missing setup, a changed catalogue or a database hiccup. |
| "Top rated" means two things | On the home page it means **chosen by the owner**. On a category page it means **computed**: the top 3 by average rating, ties broken by number of ratings. The rest are the "additional products". | The home criterion says "I have chosen"; the category criterion does not. I considered "the chosen products that fall in this category" for category pages, but with 5 picks across 4 categories most categories would show 0 or 1. 3 is a constant (`CATEGORY_TOP_RATED_COUNT`); Fake Store categories hold 4 to 6 products. I kept the brief's word "Top rated" as the home page heading, with "Our pick of the catalogue" above it, so the owner's choice is visible as a choice. The cost I accept: a chosen product can show a low rating (say 2.9 stars) under a "Top rated" heading. That is the owner's call, and it is what the criterion asks for. |
| "Text matching that search term": which text, what kind of match? | Every word of the term must match the **start of a word** in the title, description or category name, ignoring case. "jack" finds "Jacket"; "men" does not find "women's". | Plain substring matching made "men" return all the women's clothing, which a customer would read as broken. |
| Search with an empty term | The browser asks for a term (the field is required). `/search` with no term shows a hint. The API answers 400. | An empty search returning everything would contradict "only see products that match". |
| "Submit an enquiry for products they want" (plural) | One product per enquiry, started from that product's page. | That is what the acceptance criterion describes. A basket of products is a bigger feature (a list that persists across pages) and is listed under "next". |
| "Contact details" on the enquiry form | Name and email required; phone and message optional. | Email is the minimum sales needs to reply. Every extra required field loses enquiries. |
| "The sales inbox will receive an email": what if sending fails? | The enquiry is saved first, then emailed. Once saved, the customer always sees "Thank you": a failed email is marked `failed`, and a failed status update is only logged. A mail server that hangs is given 6 seconds, then treated as failed; the web client waits 15. | A provider outage is ours to retry, not the customer's to resubmit. Telling them it failed after the email went out would create duplicates. Today the retry is manual: see "next". |
| Where is the sales inbox with no paid provider? | Mailpit, a local inbox at http://localhost:8025, receiving over SMTP. | Free, no account, and the same protocol a real provider uses. |
| Currency | The product carries an ISO currency code. The Fake Store adapter sets "USD", because Fake Store has no currency field. | Currency is product data. Keeping it out of the client means a source in another currency needs no client change. |
| Is loading an image from Fake Store's host "calling the API from the client"? | No. Product **data** goes through the backend; the image URL is part of that data and the browser loads the file. | Proxying images is real work with no benefit yet. It is one function away if the rule is stricter than I read it. The cost: when Fake Store is down the catalogue still works from the cache or snapshot, but its photos do not load. |
| Does the customer get a confirmation email? | No, only the on-screen "Thank you". | Not in the criteria, and sending mail to an address nobody verified invites abuse. |
| Personal data in enquiries | Name, email and phone are kept in MongoDB with no expiry, and are only ever sent to the sales inbox. | Fine for a PoC with no real customers. Before launch: a retention period, a privacy notice on the form, and a way to delete a person's data. |
| No design was supplied: how should the pages be laid out? | In a window at least 1100 by 560 pixels, listing pages (home, category, search) are a fixed frame that fits one screen at 100% zoom: when there are more products than fit, the product area scrolls inside it, and that area can be reached and scrolled from the keyboard. Product and enquiry pages fill the screen and grow if the text needs it (they fit from about 600 pixels of height, so at the smallest framed size, 1100 by 560, they may scroll by a few dozen pixels). Smaller windows and phones scroll normally. The cost I accept: a scrolling area inside a page is less familiar than a scrolling page, and a search with hundreds of results renders them all in it (paging is the fix, listed below). | The creative agency will replace the look, so the layout's job is to stay usable with any amount of data. Checked with a 194-product, 24-category sample fed through the same adapter (see `AI_USAGE.md`). |
| Light or dark? | Both. The site follows the visitor's system setting until they use the switch in the header; their choice is remembered in the browser (`catalogue-theme`) and put back before the first paint. | Two looks from one token file is the cheapest proof that the look is replaceable. Each colour is written once in `theme.css` as `light-dark(light, dark)`; an attribute on the page overrides the system setting. The cost: a browser without `light-dark()` gets only the light look, from a fallback block at the end of `theme.css` that repeats the light values (they must be kept in step). |
| A search that finds nothing | The message, then every category as a link. | A dead end loses the customer; the categories are already known to the API. |
| Where do categories come from? | Nowhere in our code. The list is whatever categories the products carry, read fresh with the catalogue. Categories are flat. | A new category in the source appears on its own. Fake Store sends one category word per product, so there is no hierarchy to show. |
| JavaScript turned off | Not supported: pages stream their content, so without JavaScript only the loading state shows. | Not in the criteria; every target browser runs JavaScript. |
| Malformed or hostile addresses | A malformed percent-encoded address (for example `/products/%E0%A4%A`) gets Next.js's own plain 500 page. | Found by failure testing. Only a hand-typed broken address reaches it, so it is left as is. |
| The database is down | Catalogue pages still work; the home page waits at most about a second for the owner's choice, then shows the best rated products; sending an enquiry fails with a friendly "try again". | Products come from the product source, not MongoDB. An enquiry cannot be saved without it, so it is not accepted. |

## 2. Dropped or simplified, and why

### What the brief needed, and what I added

The brief asks for five pages working end to end, on a structure that can
grow. That is the backend with its three seams, the five pages, the enquiry
email, the tests and these documents.

On top of that I added four things nobody asked for:

- the fit-one-screen frame on wide windows,
- the large tiles / grid view switch,
- the light/dark switch,
- the HTML sales email with the product photo.

Each has a reason (the layout must survive any amount of data; two looks
prove the look is replaceable; a sales email should show what was asked
about), but none is on the critical path. **Redoing this in three hours, I
would cut all four** and keep a plain responsive grid, one look, and a
plain-text email. They cost time and they add code a reviewer has to read.

- **No admin screen for featured products.** A command instead. Needs login first.
- **No login, accounts or roles.** Not in the criteria.
- **No paging, sorting or filters.** 20 products.
- **Search is in memory**, not a search engine or database index. 20 products.
- **No automatic retry of failed emails.** Failures are recorded, not retried.
- **No infrastructure code.** The brief says "if you include infrastructure";
  I chose containers that map onto AWS and described the mapping below.
- **No shared types between `web` and `api`.** The contract is written twice
  (`web/src/lib/types.ts`). Small now; see "next".
- **A missing product or category shows the "Not found" page with HTTP 200**,
  not 404. Pages stream, so the status is sent before the lookup finishes
  (documented Next.js behaviour). The page is marked `noindex`. A real 404
  would mean looking up before streaming, which slows every page a little.
- **No nested categories.** One flat category per product, because that is
  all the source sends. A parent path on `Category` is the growth route; the
  rules compare slugs only, so they would not change.
- **The enquiry page keeps the full header.**
- **The view switch (large tiles or a four-across grid) is remembered in the
  browser, not on the server.** It is a visitor's taste, not catalogue data,
  so it never reaches the API. An attribute on the page and CSS do the work;
  a small script sets it before the first paint so a returning visitor sees
  no flash (the pattern from the Next.js guide shipped in the package). The
  switch is hidden on small screens, where there is one sensible layout.
  Grid view has one rule on every page and for every count: a tile is a
  quarter of the width and half the height. A short list leaves its last
  slots empty; nothing is stretched to fill. On a category page the top
  rated products come first in that same grid and carry a "Top rated" badge,
  so there is no half-empty row between them and the rest.
- **Scrolling lists keep their scroll to themselves, and photo tiles are not
  isolated.** Lists that scroll inside the page use
  `overscroll-behavior: contain`, so reaching the end does not scroll the
  page behind. `isolation: isolate` on the photo area was removed: measured
  with the blended photo and the "Top rated" badge, it made badged tiles
  paint one scroll step late. The hover zoom on photos went with it.
- **Cards on a category page do not repeat the category name.** The page
  heading says it once.
- **Listing pages render every product they are given.** The inner scroll
  area copes with a couple of hundred; beyond that the API needs paging.
- **CI is minimal.** `.github/workflows/ci.yml` runs lint (web), type-check,
  unit tests and build for both apps. It does not build the images or run the
  browser tests yet (see "With another day").
- **Tests against a real MongoDB run only when asked.** The two Mongo classes
  have their own tests (`api/test/mongo.integration.test.ts`) that run when
  `MONGODB_TEST_URI` is set, as it is in CI. Without it they are skipped, so
  `npm test` still needs no infrastructure.

## 3. How the design supports growth beyond the PoC

The brief names three things that will change. Each has exactly one seam.

**Product data source: `ProductSource` (one method, `getAll()`).**
Only the `fakeStore*` files know Fake Store's field names; the adapter
validates each item, drops and logs a bad one, and maps the rest to the
catalogue's own `Product`. Its URL is a setting (`FAKESTORE_BASE_URL`) read in
the composition root. `FixtureProductSource` is a second implementation with
**no mapper at all**: its data is already in the catalogue's shape, so it shows
what a differently shaped source plugs into. A new source is one new class
plus a few lines in `composition.ts`. Product ids are strings so a source with
non-numeric ids fits.

Known limits of the seam: category identity is the slug of the category
*name*, so a source that renames a category changes its URL; and featured
picks are stored as source ids, so a new source with new ids drops them (they
fall back to best rated, with a warning in the log).

**Email provider: `EmailSender` (one method, `send()`).**
`SmtpEmailSender` covers Mailpit locally and an SMTP provider such as Amazon
SES by settings alone: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
and `SMTP_SECURE` if the port needs forcing. Unset, port 465 uses TLS from
the first byte and other ports upgrade to TLS when the server offers it.
Docker Compose passes these through and defaults to its Mailpit container,
so switching provider is an edit to `.env`, not to code. `ConsoleEmailSender` is
the second implementation. A provider with its own API is one new class.

**Look and feel: `web/src/app/theme.css`.**
Every colour, font, type size, letter spacing, radius and spacing value is a
token there, in light and dark. A new palette or typeface is an edit to that
one file. A new *layout* (a different product card, say) also touches
`globals.css` and the component, which are small and kept separate from data
fetching.

This seam was used once already. Part-way through, the whole look was
replaced (a warm serif design became the current white/black one, with new
page layouts). The palette and type change was `theme.css` alone; the new
layouts touched `globals.css`, the page files and the components. Nothing in
`api/` and nothing in `web/src/lib/` changed, and the browser tests needed
one added assertion and no rewrites.

Layout rules that keep it safe as data grows: no page assumes a product
count (the home page lays out however many the API sends), listing areas
scroll inside the frame, the category row in the header scrolls sideways,
and long titles and prices shorten instead of pushing the layout.

Other choices that keep it changeable:

- **The rules do not depend on the framework.** `CatalogueService` and
  `EnquiryService` take interfaces and know nothing about Express, MongoDB or
  Fake Store. That is also why the tests run with no infrastructure.
  `EnquiryService` looks products up through a one-method `ProductLookup`,
  which `CatalogueService` satisfies. One shortcut I would defend but not
  hide: the error classes carry their HTTP status (`errors.ts`).
- **One composition root** (`api/src/composition.ts`) decides what sits behind
  each interface.
- **The client has one door** (`web/src/lib/api.ts`). It runs server-side, so
  the API does not have to be reachable from the internet; locally it is
  published on 127.0.0.1 only.
- **Caching lives in one place**, the backend (`CachedProductSource`): 5
  minutes, shared in-flight requests, the last good copy served if the source
  fails, and a 30-second pause before asking a failing source again. The
  bundled snapshot is only the last resort, for a first run with Fake Store
  down; the cache sits *inside* the fallback so that one failed call cannot
  swap live data for the snapshot. Next.js caches nothing, so there is one
  place to reason about staleness.
- **Validation lives in one place**, the API. The form shows the API's
  messages instead of repeating the rules. The form and search box do carry
  `required` and maximum lengths as browser hints; the API does not rely on
  them.
- **Configuration is validated at startup** and fails with every problem
  listed.

**What does not scale yet, deliberately.** `ProductSource.getAll()` loads the
whole catalogue and the service filters in memory. That is right for 20
products and wrong for 20,000. The fix is known and local: the interface grows
`search` and `byCategory` with paging, and the service delegates. The cache
and the enquiry rate limiter are both per process: several instances would
each hold their own copy, and each allow the full limit.

**AWS mapping (not built, not tested).** `web` and `api` are plain containers:
ECS on Fargate, or App Runner, with the API on a private network. MongoDB: a
MongoDB-compatible managed service (Amazon DocumentDB or MongoDB Atlas on
AWS); the code uses only `findOne`, `insertOne`, `updateOne` and `ping`.
Email: Amazon SES through its SMTP interface. Shared cache when there are
several API instances: ElastiCache. Spam protection: AWS WAF rate rules on the
load balancer.

## 4. Security basics included

- Enquiry input validated on the server; line breaks and other control
  characters refused in single-line fields, and the email address (used as
  the Reply-To header) must be a valid address.
- The enquiry email is sent as HTML with a plain-text copy. Everything the
  customer typed, and the product title, is escaped before it goes into the
  HTML, so it is shown as typed and never becomes markup (tested with script
  and image tags). The email shows the product's photo, loaded by the mail
  program from the product source's host (only an http(s) address is used),
  and has two links: reply to the customer, and the product's page.
- Request bodies capped at 10 KB; standard security headers; no framework
  banner headers; no stack traces or internal error details in responses.
- Every web page carries security headers (`web/next.config.ts`): a
  Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a
  Referrer-Policy and a Permissions-Policy. The policy has no nonce: the
  bundled Next.js guide
  (`web/node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)
  says nonces force dynamic rendering and are incompatible with partial
  prerendering, so `script-src` keeps `'unsafe-inline'`. Images are allowed
  from any http(s) host, because product photos come from the product
  source's own host.
- The upstream product payload is validated before use, including that image
  URLs are http(s).
- Containers run as a non-root user. MongoDB and SMTP are not published
  outside the Docker network; the Mailpit inbox is published on 127.0.0.1
  only. No secrets in the repository.
- **Rate limiting, honestly:** the API allows 20 enquiries per customer
  address per 15 minutes. The address comes from `X-Forwarded-For`; the web
  server forwards the right-most entry, which is the one the nearest proxy
  added. Behind a load balancer (production) that is the real client address.
  In the local Docker run there is no proxy, so a client that sends its own
  `X-Forwarded-For` header can dodge the limit. It is a best-effort guard
  here, and the real control in production is the load balancer plus WAF
  rules (and, if spam appears, a CAPTCHA or honeypot field).

## 5. With another day

1. **Retry failed enquiry emails**: a small worker over `emailStatus: failed`
   and stale `pending` records (a queue such as SQS in production).
2. **More CI**: lint, type-check, unit tests and build already run; next,
   build both images, start the stack and run the browser tests on every
   pull request.
3. **One API contract**: describe the API in OpenAPI, generate the client
   types, delete the hand-written copy.
4. **Push search and paging into `ProductSource`**, ahead of a real catalogue.
5. **Login for the owner**, then a real screen for choosing featured products.
6. **Spam protection on the form** that does not depend on IP addresses.
7. **Enquire about several products at once** (a short list kept across pages).
8. **Structured logs and request ids**; infrastructure as code for the AWS
   mapping above.
