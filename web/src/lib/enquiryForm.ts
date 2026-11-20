export const ENQUIRY_FIELDS = ["name", "email", "phone", "message"] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

export type EnquiryFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors: Partial<Record<EnquiryField, string[]>>;
      /** What the customer typed, so a failed submit does not wipe the form. */
      values: Record<EnquiryField, string>;
    };

export type EnquiryAction = (
  previous: EnquiryFormState,
  formData: FormData,
) => Promise<EnquiryFormState>;
