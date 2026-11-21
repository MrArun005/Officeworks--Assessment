/**
 * The seam for "the email provider is expected to change".
 *
 * `text` is always present. `html` is optional and is the same message laid
 * out for mail programs; whoever builds it must escape anything a customer
 * typed (see `enquiries/enquiryEmail.ts`).
 */
export interface EmailMessage {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Prints the email instead of sending it; for running without any mail server. */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.info("[email:console]", JSON.stringify(message, null, 2));
  }
}
