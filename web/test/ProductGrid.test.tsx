import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductGrid";
import type { Product } from "@/lib/types";

const product = (id: string, title: string): Product => ({
  id,
  title,
  description: "A product.",
  price: 19.5,
  currency: "USD",
  imageUrl: `https://images.test/${id}.png`,
  category: { slug: "bags", name: "bags" },
  rating: { average: 4.25, count: 120 },
});

const products = [product("1", "Canvas backpack"), product("2", "Leather satchel")];

describe("ProductGrid", () => {
  it("shows every product it is given, in the order given", () => {
    render(<ProductGrid products={products} />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/products/1", "/products/2"]);
    expect(within(links[0]!).getByText("Canvas backpack")).toBeInTheDocument();
  });

  it("lets a screen reader hear what a sighted customer sees on a card", () => {
    render(<ProductGrid products={products.slice(0, 1)} />);

    const card = screen.getByRole("link");
    expect(card).not.toHaveAttribute("aria-label");
    expect(card).toHaveTextContent("Bags");
    expect(card).toHaveTextContent("Canvas backpack");
    expect(card).toHaveTextContent("$19.50");
    expect(card).toHaveTextContent("Rated ★ 4.3 (120 ratings)");
  });

  it("the plain grid is just a list", () => {
    render(<ProductGrid products={products} />);

    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("grid");
  });

  it.each([
    ["row", "grid grid--row"],
    ["showcase", "grid grid--row grid--showcase"],
    ["list", "grid grid--list"],
  ] as const)("the %s layout scrolls inside a named area the keyboard can reach", (layout, classes) => {
    render(<ProductGrid products={products} layout={layout} label="Top rated products" />);

    const region = screen.getByRole("region", { name: "Top rated products" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(within(region).getByRole("list")).toHaveClass(classes, { exact: true });
  });
});

describe("ProductGridSkeleton", () => {
  it("holds the place of a loading list and says it is loading", () => {
    render(<ProductGridSkeleton count={3} layout="row" />);

    const list = screen.getByRole("list", { name: "Loading products" });
    expect(list).toHaveAttribute("aria-busy", "true");
    expect(list).toHaveClass("grid grid--row", { exact: true });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
