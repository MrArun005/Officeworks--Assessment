import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ScrollRegion } from "@/components/ScrollRegion";
import { ViewToggle } from "@/components/ViewToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-view");
  localStorage.clear();
});

describe("ViewToggle", () => {
  it("starts on large tiles", () => {
    render(<ViewToggle />);

    expect(screen.getByRole("button", { name: "Large tiles" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Grid, four across" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the page to grid view and remembers the choice", async () => {
    render(<ViewToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Grid, four across" }));

    expect(screen.getByRole("button", { name: "Grid, four across" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-view", "grid");
    expect(localStorage.getItem("catalogue-view")).toBe("grid");
  });

  it("keeps every switch on the page in step", async () => {
    render(
      <>
        <ViewToggle />
        <ViewToggle />
      </>,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Grid, four across" })[0]!);

    for (const button of screen.getAllByRole("button", { name: "Grid, four across" })) {
      expect(button).toHaveAttribute("aria-pressed", "true");
    }
  });
});

describe("ScrollRegion", () => {
  it("is a named, focusable region only in the view where it scrolls", async () => {
    render(
      <>
        <ViewToggle />
        <ScrollRegion className="a" label="Whole category" when="grid">
          <ScrollRegion className="b" label="Top rated products" when="large">
            content
          </ScrollRegion>
        </ScrollRegion>
      </>,
    );

    expect(screen.getByRole("region", { name: "Top rated products" })).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("region", { name: "Whole category" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Grid, four across" }));

    expect(screen.getByRole("region", { name: "Whole category" })).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("region", { name: "Top rated products" })).not.toBeInTheDocument();
  });
});
