import { describe, expect, it } from "vitest";
import type { Enquiry } from "../src/enquiries/enquiry.js";
import { buildEnquiryEmail, escapeHtml } from "../src/enquiries/enquiryEmail.js";
import { product } from "./helpers.js";

const watch = product("95", { title: "Cellini Date Black Dial", price: 8999.99, category: "mens watches" });

const enquiry = (overrides: Partial<Enquiry> = {}): Enquiry => ({
  id: "6b000d97ffe8c5e21add173e",
  productId: "95",
  productTitle: watch.title,
  name: "Asha Rao",
  email: "asha@example.test",
  phone: "07000 000000",
  message: "Is a discount coming up?\nI can wait a month.",
  emailStatus: "pending",
  createdAt: new Date("2026-11-20T09:05:00Z"),
  ...overrides,
});

const addresses = {
  salesInbox: "sales@shop.test",
  from: "catalogue@shop.test",
  webUrl: "https://shop.test/",
};

describe("the enquiry email", () => {
  it("goes to the sales inbox, and a reply goes to the customer", () => {
    const email = buildEnquiryEmail(enquiry(), watch, addresses);

    expect(email).toMatchObject({
      to: "sales@shop.test",
      from: "catalogue@shop.test",
      replyTo: "asha@example.test",
      subject: "New enquiry: Cellini Date Black Dial",
    });
  });

  it("tells sales who asked, about what, and when, in both forms", () => {
    const email = buildEnquiryEmail(enquiry(), watch, addresses);

    for (const body of [email.text, email.html!]) {
      expect(body).toContain("Asha Rao");
      expect(body).toContain("asha@example.test");
      expect(body).toContain("07000 000000");
      expect(body).toContain("Cellini Date Black Dial");
      expect(body).toContain("$8,999.99");
      expect(body).toContain("mens watches");
      expect(body).toContain("3.0 out of 5 (10 ratings)");
      expect(body).toContain("https://shop.test/products/95");
      expect(body).toContain("20 Nov 2026, 09:05 UTC");
      expect(body).toContain("6b000d97ffe8c5e21add173e");
    }
    expect(email.text).toContain("Reply to this email to answer Asha Rao directly.");
    expect(email.html).toContain("Asha Rao is asking about a product");
    expect(email.text).toContain("Is a discount coming up?\nI can wait a month.");
    expect(email.html).toContain("Is a discount coming up?<br>I can wait a month.");
  });

  it("shows the product's photo and offers a reply and the product page", () => {
    const { html } = buildEnquiryEmail(enquiry(), watch, addresses);

    expect(html).toContain(`<img src="https://img.test/95.png"`);
    expect(html).toContain(`alt="Cellini Date Black Dial"`);
    expect(html).toContain(`href="mailto:asha%40example.test?subject=Re%3A%20your%20enquiry%20about%20Cellini%20Date%20Black%20Dial"`);
    expect(html).toContain(">Reply to Asha Rao</a>");
    expect(html).toContain(`href="https://shop.test/products/95"`);
  });

  it("leaves out the photo when its address is not a web address, and the link when the site is unknown", () => {
    const { html, text } = buildEnquiryEmail(
      enquiry(),
      product("7", { imageUrl: "javascript:alert(1)" }),
      { salesInbox: "sales@shop.test", from: "catalogue@shop.test" },
    );

    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("View product");
    expect(text).not.toContain("/products/7");
  });

  it("leaves out the phone line and says so when there is no message", () => {
    const email = buildEnquiryEmail(enquiry({ phone: undefined, message: undefined }), watch, addresses);

    expect(email.text).not.toContain("Phone");
    expect(email.html).not.toContain("Phone");
    expect(email.text).toContain("the customer left the message blank");
    expect(email.html).toContain("The customer left the message blank.");
  });

  it("shows what the customer typed as text, never as markup", () => {
    const email = buildEnquiryEmail(
      enquiry({
        name: `<b>Asha</b> "R" & co`,
        message: `<img src=x onerror=alert(1)> <a href="https://evil.test">click</a>`,
      }),
      product("1", { title: "<script>alert(1)</script>" }),
      addresses,
    );

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).not.toContain("evil.test\">");
    expect(email.html).not.toContain("<b>");
    expect(email.html).toContain("&lt;b&gt;Asha&lt;/b&gt; &quot;R&quot; &amp; co");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // The plain-text form carries the characters exactly as typed.
    expect(email.text).toContain(`<b>Asha</b> "R" & co`);
  });

  it("shows a price even when the currency code is not one it knows", () => {
    const email = buildEnquiryEmail(enquiry(), product("1", { price: 12, currency: "credits" }), addresses);

    expect(email.text).toContain("12 credits");
  });
});

describe("escapeHtml", () => {
  it("escapes the five characters that can start markup or end an attribute", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});
