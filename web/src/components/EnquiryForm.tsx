"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { EnquiryAction, EnquiryField, EnquiryFormState } from "@/lib/enquiryForm";

const initialState: EnquiryFormState = { status: "idle" };

interface EnquiryFormProps {
  productTitle: string;
  action: EnquiryAction;
  /** Shown under the thank-you message: where the customer can go next. */
  onward?: ReactNode;
}

/**
 * Next.js keeps visited pages alive (React <Activity>) instead of unmounting
 * them. Without a reset, leaving after a successful enquiry and coming back
 * would show the old "Thank you" and no form. The key changes when the page
 * is hidden after a success, so the next visit starts with an empty form.
 * Pattern from the bundled docs: guides/preserving-ui-state.md.
 */
export function EnquiryForm(props: EnquiryFormProps) {
  const [formKey, setFormKey] = useState(0);
  const submitted = useRef(false);

  useLayoutEffect(
    () => () => {
      if (submitted.current) {
        submitted.current = false;
        setFormKey((key) => key + 1);
      }
    },
    [],
  );

  // Stable, so the effect that calls it runs once per result, not per render.
  const markSubmitted = useCallback(() => {
    submitted.current = true;
  }, []);

  return <EnquiryFormInner key={formKey} {...props} onSuccess={markSubmitted} />;
}

/**
 * The action arrives as a prop, so this component knows nothing about how an
 * enquiry is sent and can be tested with a plain function.
 */
function EnquiryFormInner({
  productTitle,
  action,
  onward,
  onSuccess,
}: EnquiryFormProps & { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const id = useId();
  const feedback = useRef<HTMLElement>(null);

  // Move focus to the result, so keyboard and screen-reader users hear it
  // instead of being dropped at the top of the page.
  useEffect(() => {
    if (state.status === "success") onSuccess();
    if (state.status !== "idle") feedback.current?.focus();
  }, [state, onSuccess]);

  if (state.status === "success") {
    return (
      <div className="notice notice--success" role="status">
        <h2 ref={feedback as React.RefObject<HTMLHeadingElement>} tabIndex={-1}>
          Thank you
        </h2>
        <p>
          Your enquiry about <strong>{productTitle}</strong> has been received. Our sales
          team will be in touch.
        </p>
        {onward && <p className="notice__actions">{onward}</p>}
      </div>
    );
  }

  const failed = state.status === "error" ? state : undefined;
  const fieldId = (name: EnquiryField) => `${id}-${name}`;

  const field = (name: EnquiryField) => {
    const errors = failed?.fieldErrors[name];
    return {
      id: fieldId(name),
      name,
      defaultValue: failed?.values[name] ?? "",
      "aria-invalid": errors ? true : undefined,
      "aria-describedby": errors ? `${fieldId(name)}-error` : undefined,
    };
  };

  const errorFor = (name: EnquiryField) => {
    const errors = failed?.fieldErrors[name];
    return errors ? (
      <p className="field__error" id={`${fieldId(name)}-error`}>
        {errors.join(" ")}
      </p>
    ) : null;
  };

  // aria-disabled, not disabled: a disabled button loses focus mid-submit.
  const blockWhilePending = (event: FormEvent<HTMLFormElement>) => {
    if (pending) event.preventDefault();
  };

  return (
    <form
      action={formAction}
      onSubmit={blockWhilePending}
      className="form"
      aria-label="Enquiry form"
    >
      {failed && (
        <p
          ref={feedback as React.RefObject<HTMLParagraphElement>}
          tabIndex={-1}
          className="notice notice--error"
          role="alert"
        >
          {failed.message}
        </p>
      )}

      <div className="field field--half">
        <label htmlFor={fieldId("name")}>Name</label>
        <input {...field("name")} type="text" autoComplete="name" required maxLength={100} />
        {errorFor("name")}
      </div>

      <div className="field field--half">
        <label htmlFor={fieldId("email")}>Email</label>
        <input {...field("email")} type="email" autoComplete="email" required maxLength={254} />
        {errorFor("email")}
      </div>

      <div className="field">
        <label htmlFor={fieldId("phone")}>
          Phone <span className="field__hint">(optional)</span>
        </label>
        <input {...field("phone")} type="tel" autoComplete="tel" maxLength={30} />
        {errorFor("phone")}
      </div>

      <div className="field">
        <label htmlFor={fieldId("message")}>
          Message <span className="field__hint">(optional)</span>
        </label>
        <textarea {...field("message")} rows={3} maxLength={2000} />
        {errorFor("message")}
      </div>

      <button type="submit" className="button button--large" aria-disabled={pending}>
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
