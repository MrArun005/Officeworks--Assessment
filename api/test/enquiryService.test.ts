import { describe, expect, it } from "vitest";
import { InMemoryEnquiryRepository } from "../src/enquiries/enquiryRepository.js";
import { EnquiryService, type ProductLookup } from "../src/enquiries/enquiryService.js";
import { NotFoundError } from "../src/errors.js";
import { product, RecordingEmailSender } from "./helpers.js";

const mail = { salesInbox: "sales@shop.test", from: "catalogue@shop.test" };
const input = { productId: "3", name: "Asha Rao", email: "asha@example.test" };

describe("enquiry service", () => {
  it("needs only a product lookup, not the whole catalogue", async () => {
    const lookup: ProductLookup = {
      getProduct: async (id) => product(id, { title: "Cotton Jacket" }),
    };
    const repository = new InMemoryEnquiryRepository();
    const email = new RecordingEmailSender();

    const enquiry = await new EnquiryService(lookup, repository, email, mail).submit(input);

    expect(enquiry).toMatchObject({ productTitle: "Cotton Jacket", emailStatus: "sent" });
    expect(repository.enquiries).toHaveLength(1);
    expect(email.sent).toHaveLength(1);
  });

  it("saves nothing when the lookup cannot find the product", async () => {
    const lookup: ProductLookup = {
      getProduct: async (id) => {
        throw new NotFoundError(`Product "${id}" was not found`);
      },
    };
    const repository = new InMemoryEnquiryRepository();
    const email = new RecordingEmailSender();

    await expect(
      new EnquiryService(lookup, repository, email, mail).submit(input),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.enquiries).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });
});
