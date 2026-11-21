import { z } from "zod";

/** A blank optional field counts as "not given", not as an invalid value. */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/**
 * A required single-line value. Control characters (including line breaks)
 * are refused because these values end up in email headers and bodies.
 * Messages are written for the customer: the form shows them as they are.
 */
const singleLine = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
    .regex(/^[^\p{Cc}]*$/u, `${label} contains characters that are not allowed`);

export const enquiryInputSchema = z.object({
  productId: singleLine("Product", 64),
  name: singleLine("Name", 100),
  // Used as the email's Reply-To header; z.email() refuses line breaks.
  email: z
    .string("Enter a valid email address")
    .trim()
    .max(254, "Email must be at most 254 characters")
    .pipe(z.email("Enter a valid email address")),
  phone: z.preprocess(blankToUndefined, singleLine("Phone", 30).optional()),
  message: z.preprocess(
    blankToUndefined,
    z.string().trim().max(2000, "Message must be at most 2000 characters").optional(),
  ),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export type EmailStatus = "pending" | "sent" | "failed";

export interface Enquiry extends EnquiryInput {
  id: string;
  /** Copied at submission so the record still reads well if the product goes. */
  productTitle: string;
  emailStatus: EmailStatus;
  createdAt: Date;
}
