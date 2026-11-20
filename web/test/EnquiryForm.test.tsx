import { render, screen } from "@testing-library/react";
import { Activity } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EnquiryForm } from "@/components/EnquiryForm";
import type { EnquiryAction, EnquiryFormState } from "@/lib/enquiryForm";

function renderForm(result: EnquiryFormState) {
  const action = vi.fn<EnquiryAction>(async () => result);
  render(<EnquiryForm productTitle="Cotton Jacket" action={action} />);
  return action;
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Asha Rao");
  await user.type(screen.getByLabelText("Email"), "asha@example.test");
  await user.type(screen.getByLabelText(/Message/), "Is this available in medium?");
  await user.click(screen.getByRole("button", { name: "Send enquiry" }));
}

describe("EnquiryForm", () => {
  it("submits the contact details and shows a thank-you message", async () => {
    const action = renderForm({ status: "success" });

    await fillAndSubmit();

    const thanks = await screen.findByRole("heading", { name: "Thank you" });
    expect(thanks).toHaveFocus();
    expect(screen.getByText("Cotton Jacket")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send enquiry" })).not.toBeInTheDocument();

    const formData = action.mock.calls[0]![1];
    expect(Object.fromEntries(formData)).toEqual({
      name: "Asha Rao",
      email: "asha@example.test",
      phone: "",
      message: "Is this available in medium?",
    });
  });

  it("offers a way onward after the thank-you, and not before", async () => {
    const action = vi.fn<EnquiryAction>(async () => ({ status: "success" }));
    render(
      <EnquiryForm
        productTitle="Cotton Jacket"
        action={action}
        onward={<a href="#onward">Continue browsing</a>}
      />,
    );
    expect(screen.queryByRole("link", { name: "Continue browsing" })).not.toBeInTheDocument();

    await fillAndSubmit();

    await screen.findByRole("heading", { name: "Thank you" });
    expect(screen.getByRole("link", { name: "Continue browsing" })).toBeInTheDocument();
  });

  it("shows field errors and keeps what the customer typed when the submit fails", async () => {
    renderForm({
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: { email: ["Enter a valid email address"] },
      values: { name: "Asha Rao", email: "asha@", phone: "", message: "" },
    });

    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please check the highlighted fields.");
    expect(alert).toHaveFocus();
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Enter a valid email address");
    expect(email).toHaveValue("asha@");
    expect(screen.getByLabelText("Name")).toHaveValue("Asha Rao");
    expect(screen.queryByRole("heading", { name: "Thank you" })).not.toBeInTheDocument();
  });

  it("shows a fresh form, not the old thank-you, when the customer comes back", async () => {
    // Next.js hides a visited page with React <Activity> instead of
    // unmounting it; this reproduces leaving the page and returning.
    const action = vi.fn<EnquiryAction>(async () => ({ status: "success" }));
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <EnquiryForm productTitle="Cotton Jacket" action={action} />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await fillAndSubmit();
    await screen.findByRole("heading", { name: "Thank you" });

    rerender(page("hidden"));
    rerender(page("visible"));

    expect(await screen.findByRole("button", { name: "Send enquiry" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Thank you" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("marks name and email as required and phone and message as optional", () => {
    renderForm({ status: "idle" });

    expect(screen.getByLabelText("Name")).toBeRequired();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText(/Phone/)).not.toBeRequired();
    expect(screen.getByLabelText(/Message/)).not.toBeRequired();
  });
});
