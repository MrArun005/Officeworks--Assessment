/**
 * The five acceptance criteria from the brief, walked in a real browser, plus
 * two checks on the layout rules. Actions (clicks, typing) find things by
 * role and visible text, the way a customer does. Product tiles have no
 * role of their own, so counting them uses their class names.
 * Next.js keeps visited pages hidden in the document, so lists are always
 * scoped to visible elements.
 */
import { expect, test, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

const visibleCards = (page: Page) => page.locator("main a.card").filter({ visible: true });

test("home page: I see the five featured products", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Top rated" })).toBeVisible();
  await expect(visibleCards(page)).toHaveCount(5);
});

test("category page: top rated products, then the rest of the category", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Categories" })
    .getByRole("link", { name: "Electronics", exact: true })
    .click();

  await expect(page.getByRole("heading", { level: 1, name: "Electronics" })).toBeVisible();
  const topRated = page.locator("section", { has: page.getByRole("heading", { name: "Top rated" }) });
  const more = page.locator("section", { has: page.getByRole("heading", { name: "More in this category" }) });
  await expect(topRated.filter({ visible: true }).locator("a.card")).toHaveCount(3);
  await expect(more.filter({ visible: true }).locator("a.card").first()).toBeVisible();
  // The heading names the category once; cards do not repeat it.
  await expect(page.locator("main .card__category").filter({ visible: true })).toHaveCount(0);

  // "The rest" means the rest: nothing is listed twice.
  const titlesIn = (section: typeof more) =>
    section.filter({ visible: true }).locator(".card__title").allTextContents();
  const top = await titlesIn(topRated);
  for (const title of await titlesIn(more)) expect(top).not.toContain(title);
});

test("search: only products matching the term are shown", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search products" }).fill("jacket");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/search\?q=jacket/);
  await expect(page.getByRole("status")).toContainText("match “jacket”");
  const titles = await page.locator("main .card__title").filter({ visible: true }).allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  for (const title of titles) expect(title.toLowerCase()).toContain("jacket");
});

test("search: a term that matches nothing says so", async ({ page }) => {
  await page.goto("/search?q=spaceship");
  await expect(page.getByRole("status")).toHaveText("No products match “spaceship”.");
  // Not a dead end: the categories are offered instead.
  await expect(
    page.getByRole("navigation", { name: "Browse by category" }).getByRole("link").first(),
  ).toBeVisible();
  await expect(visibleCards(page)).toHaveCount(0);
});

test("product page: clicking a tile opens its details", async ({ page }) => {
  await page.goto("/");
  const firstCard = visibleCards(page).first();
  const title = (await firstCard.locator(".card__title").textContent())!.trim();
  await firstCard.click();

  await expect(page).toHaveURL(/\/products\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page).toHaveTitle(new RegExp(title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.getByRole("link", { name: "Enquire", exact: true })).toBeVisible();
});

test("enquiry: the sales inbox gets an email and I see Thank you; coming back gives a fresh form", async ({
  page,
  request,
}) => {
  const marker = `E2E ${Date.now()}`;

  await page.goto("/products/3");
  const productTitle = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await page.getByRole("link", { name: "Enquire", exact: true }).click();

  await page.getByLabel("Name", { exact: true }).fill("Asha Rao");
  await page.getByLabel("Email", { exact: true }).fill("asha@example.test");
  await page.getByLabel(/Message/).fill(marker);
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.getByRole("heading", { name: "Thank you" })).toBeFocused();

  // The sales inbox (Mailpit) received it.
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`"${marker}"`)}`);
        const body = (await res.json()) as { messages: { Subject: string; To: { Address: string }[] }[] };
        return body.messages.map((m) => ({ subject: m.Subject, to: m.To.map((t) => t.Address) }));
      },
      { timeout: 10_000 },
    )
    .toEqual([{ subject: `New enquiry: ${productTitle}`, to: ["sales@example.test"] }]);

  // Leaving and coming back must not show the old "Thank you".
  await page.getByRole("link", { name: "← Back to product" }).click();
  await page.getByRole("link", { name: "Enquire", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send enquiry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thank you" }).filter({ visible: true })).toHaveCount(0);
});

test("enquiry: invalid details are explained and nothing is lost", async ({ page }) => {
  await page.goto("/products/3/enquire");
  await page.getByLabel("Name", { exact: true }).fill("Asha Rao");
  // Passes the browser's own email check, fails the API's.
  await page.getByLabel("Email", { exact: true }).fill("asha@localhost");
  await page.getByRole("button", { name: "Send enquiry" }).click();

  // Scoped to <main>: Next.js adds its own (empty) role="alert" route announcer.
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toHaveText("Please check the highlighted fields.");
  await expect(alert).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Asha Rao");
});

const pageOverflow = (page: Page) =>
  page.evaluate(() => ({
    down: document.documentElement.scrollHeight - window.innerHeight,
    across: document.documentElement.scrollWidth - window.innerWidth,
  }));

test("layout: on a laptop screen every page fits without scrolling the page", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 641 });
  for (const path of ["/", "/categories/electronics", "/search?q=jacket", "/products/3", "/products/3/enquire"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
    expect(await pageOverflow(page), path).toEqual({ down: 0, across: 0 });
  }
});

test("layout: on a phone nothing is wider than the screen", async ({ page }) => {
  // A common phone, and a small 320px one.
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size);
    for (const path of ["/", "/categories/electronics", "/search?q=jacket", "/products/3", "/products/3/enquire"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
      expect((await pageOverflow(page)).across, `${size.width}px ${path}`).toBe(0);
    }
  }
});

test("light and dark: the switch flips the look, and the choice is remembered", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await background();

  await page.getByRole("button", { name: "Switch between light and dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await background();
  expect(dark).not.toBe(light);

  // Still dark after a reload, although the system setting says light.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await background()).toBe(dark);

  await page.getByRole("button", { name: "Switch between light and dark" }).click();
  expect(await background()).toBe(light);
});

test("view switch: grid view shows four across and two rows to a screen, and is remembered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 641 });
  await page.goto("/search?q=a");
  await expect(visibleCards(page).first()).toBeVisible();

  const grid = page.getByRole("button", { name: "Grid, four across" }).filter({ visible: true });
  await grid.click();
  await expect(grid).toHaveAttribute("aria-pressed", "true");

  // The first eight tiles: four columns, two rows, all on screen.
  const boxes = await visibleCards(page).evaluateAll((cards) =>
    cards.slice(0, 8).map((card) => {
      const box = card.getBoundingClientRect();
      return { left: Math.round(box.left), top: Math.round(box.top), bottom: Math.round(box.bottom) };
    }),
  );
  expect(boxes).toHaveLength(8);
  expect(new Set(boxes.map((box) => box.left)).size).toBe(4);
  expect(new Set(boxes.map((box) => box.top)).size).toBe(2);
  for (const box of boxes) expect(box.bottom).toBeLessThanOrEqual(641);
  expect(await pageOverflow(page)).toEqual({ down: 0, across: 0 });

  // Still chosen after a reload, and on another page.
  await page.reload();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await page.goto("/categories/electronics");
  await expect(
    page.getByRole("button", { name: "Grid, four across" }).filter({ visible: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await pageOverflow(page)).toEqual({ down: 0, across: 0 });

  // One rule everywhere: every tile is the same size, whatever the count,
  // and top rated products are marked instead of sitting in their own row.
  const sizes = await visibleCards(page).evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      return `${Math.round(box.width)}x${Math.round(box.height)}`;
    }),
  );
  expect(new Set(sizes).size).toBe(1);
  await expect(page.locator("main .card__badge").filter({ visible: true })).toHaveCount(3);

  await page.getByRole("button", { name: "Large tiles" }).filter({ visible: true }).click();
  await expect(page.locator("main .card__badge").filter({ visible: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-view", "large");
});

test("an unknown product shows the not-found page", async ({ page }) => {
  await page.goto("/products/does-not-exist");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});
