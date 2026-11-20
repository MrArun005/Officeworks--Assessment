"use server";

import { headers } from "next/headers";
import { ApiError, createEnquiry } from "@/lib/api";
import {
  ENQUIRY_FIELDS,
  type EnquiryField,
  type EnquiryFormState,
} from "@/lib/enquiryForm";

/**
 * The customer's address, for the API's per-customer rate limit.
 *
 * Takes the RIGHT-most X-Forwarded-For entry: that is the one added by the
 * nearest proxy (in production, the load balancer in front of the web
 * server). Entries further left were sent by the browser and can be forged.
 * With no proxy in front (local Docker run), Next.js fills the header from
 * the socket only when the browser did not send one, so the limit is
 * best-effort locally and real behind a load balancer. See DECISIONS.md.
 */
function clientAddress(forwardedFor: string | null): string | undefined {
  const entries = forwardedFor?.split(",").map((entry) => entry.trim()).filter(Boolean);
  return entries?.at(-1);
}

/**
 * Passes the enquiry form to the backend. There are no validation rules here
 * on purpose: the API owns them, and this only relays its verdict to the form.
 */
export async function submitEnquiry(
  productId: string,
  _previous: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const values = Object.fromEntries(
    ENQUIRY_FIELDS.map((field) => [field, String(formData.get(field) ?? "").trim()]),
  ) as Record<EnquiryField, string>;

  const customerIp = clientAddress((await headers()).get("x-forwarded-for"));

  try {
    await createEnquiry(
      {
        productId,
        name: values.name,
        email: values.email,
        // Optional fields are left out rather than sent as empty strings.
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.message ? { message: values.message } : {}),
      },
      customerIp,
    );
    return { status: "success" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors: error.fieldErrors ?? {},
        values,
      };
    }
    if (error instanceof ApiError && error.status === 429) {
      return {
        status: "error",
        message: "You have sent several enquiries already. Please try again later.",
        fieldErrors: {},
        values,
      };
    }
    console.error("Enquiry submission failed", error);
    return {
      status: "error",
      message: "We could not send your enquiry. Please try again in a moment.",
      fieldErrors: {},
      values,
    };
  }
}
