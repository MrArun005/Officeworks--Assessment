import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const defaults = {
  PORT: 4000,
  PRODUCT_SOURCE: "fakestore",
  FAKESTORE_BASE_URL: "https://fakestoreapi.com",
  PRODUCT_CACHE_TTL_SECONDS: 300,
  MONGODB_URI: "mongodb://localhost:27017",
  MONGODB_DB: "catalogue",
  EMAIL_PROVIDER: "smtp",
  SMTP_HOST: "localhost",
  SMTP_PORT: 1025,
  MAIL_FROM: "catalogue@example.test",
  SALES_INBOX: "sales@example.test",
  PUBLIC_WEB_URL: "http://localhost:3000",
};

describe("configuration", () => {
  it("runs with no settings at all, using the documented defaults", () => {
    expect(loadConfig({})).toEqual(defaults);
  });

  it("treats a blank value like a missing one", () => {
    const blankEnv = Object.fromEntries(
      [...Object.keys(defaults), "SMTP_USER", "SMTP_PASS", "SMTP_SECURE"].map((key) => [key, ""]),
    );
    expect(loadConfig(blankEnv)).toEqual(defaults);
  });

  it("reads numbers and choices from their text form", () => {
    expect(
      loadConfig({ PORT: "4100", PRODUCT_SOURCE: "fixture", SMTP_USER: "ses-user" }),
    ).toMatchObject({ PORT: 4100, PRODUCT_SOURCE: "fixture", SMTP_USER: "ses-user" });
  });

  it("names every bad setting in one error, not just the first", () => {
    let message = "";
    try {
      loadConfig({ PORT: "abc", MAIL_FROM: "not-an-email", PRODUCT_SOURCE: "x" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/^Invalid configuration:/);
    // zod's prettifyError ends each problem with "→ at KEY".
    expect(message).toContain("→ at PORT\n");
    expect(message).toContain("→ at MAIL_FROM");
    expect(message).toContain("→ at PRODUCT_SOURCE");
  });

  describe("SMTP_SECURE", () => {
    it("reads \"true\" and \"false\"", () => {
      expect(loadConfig({ SMTP_SECURE: "true" }).SMTP_SECURE).toBe(true);
      expect(loadConfig({ SMTP_SECURE: "false" }).SMTP_SECURE).toBe(false);
    });

    it("stays unset when missing or blank, so nodemailer decides by port", () => {
      expect(loadConfig({}).SMTP_SECURE).toBeUndefined();
      expect(loadConfig({ SMTP_SECURE: "" }).SMTP_SECURE).toBeUndefined();
    });

    it("rejects anything else rather than guessing", () => {
      expect(() => loadConfig({ SMTP_SECURE: "yes" })).toThrow(/SMTP_SECURE/);
    });
  });
});
