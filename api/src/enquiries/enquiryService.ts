import type { CatalogueService } from "../catalogue/catalogueService.js";
import type { EmailSender } from "../email/emailSender.js";
import type { Enquiry, EnquiryInput } from "./enquiry.js";
import { buildEnquiryEmail } from "./enquiryEmail.js";
import type { EnquiryRepository } from "./enquiryRepository.js";

export interface EnquiryMailSettings {
  salesInbox: string;
  from: string;
  /** Where customers reach the site; used for links in the email. */
  webUrl?: string;
  /** How long to wait for the mail server before recording "failed". */
  sendTimeoutMs?: number;
}

const DEFAULT_SEND_TIMEOUT_MS = 6000;

/** Rejects if the promise has not settled in time. The work is not cancelled. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class EnquiryService {
  constructor(
    private readonly catalogue: CatalogueService,
    private readonly repository: EnquiryRepository,
    private readonly email: EmailSender,
    private readonly mail: EnquiryMailSettings,
    private readonly logError: (message: string, error: unknown) => void = console.error,
  ) {}

  /**
   * Save first, then email. Once the enquiry is saved the customer is thanked
   * whatever happens next: a failed email is recorded as "failed", and a failed
   * status update is only logged. Reporting an error after the email went out
   * would make the customer resubmit and sales receive a duplicate.
   *
   * The send is capped in time for the same reason: the web client gives up
   * on a request after a while, and a mail server that hangs must not turn a
   * saved enquiry into "please try again". A send that times out is recorded
   * as "failed" even though it may still arrive late.
   */
  async submit(input: EnquiryInput): Promise<Enquiry> {
    const product = await this.catalogue.getProduct(input.productId);

    const enquiry = await this.repository.create({
      ...input,
      productTitle: product.title,
      emailStatus: "pending",
      createdAt: new Date(),
    });

    try {
      const sending = this.email.send(buildEnquiryEmail(enquiry, product, this.mail));
      await withTimeout(
        sending,
        this.mail.sendTimeoutMs ?? DEFAULT_SEND_TIMEOUT_MS,
        "Sending the enquiry email",
      );
      enquiry.emailStatus = "sent";
    } catch (error) {
      this.logError(`Enquiry ${enquiry.id} saved but the email failed`, error);
      enquiry.emailStatus = "failed";
    }

    try {
      await this.repository.setEmailStatus(enquiry.id, enquiry.emailStatus);
    } catch (error) {
      this.logError(
        `Enquiry ${enquiry.id}: email ${enquiry.emailStatus}, but the status could not be saved`,
        error,
      );
    }
    return enquiry;
  }
}
