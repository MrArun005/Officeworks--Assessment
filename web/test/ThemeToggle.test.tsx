import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HEAD_SCRIPT } from "@/lib/headScript";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-view");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("flips the look each time and remembers the choice", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Switch between light and dark" });

    // No choice yet and no dark system setting in the test browser: light.
    await userEvent.click(button);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("catalogue-theme")).toBe("dark");

    await userEvent.click(button);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("catalogue-theme")).toBe("light");
  });

  it("the head script restores remembered choices and ignores anything else", () => {
    // Plain text, as the server-rendered layout needs it.
    expect(typeof HEAD_SCRIPT).toBe("string");

    localStorage.setItem("catalogue-theme", "dark");
    localStorage.setItem("catalogue-view", "grid");
    new Function(HEAD_SCRIPT)();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-view", "grid");

    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-view");
    localStorage.setItem("catalogue-theme", "<script>");
    localStorage.setItem("catalogue-view", "huge");
    new Function(HEAD_SCRIPT)();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(document.documentElement).not.toHaveAttribute("data-view");
  });
});
