import { describe, expect, it } from "vitest";
import { validateFeaturedIds } from "../src/featured/validateFeaturedIds.js";
import { product } from "./helpers.js";

const catalogue = ["1", "2", "3", "4", "5", "6", "7"].map((id) => product(id));

describe("choosing the featured products", () => {
  it("accepts exactly five different ids that are in the catalogue", () => {
    expect(validateFeaturedIds(["3", "5", "1", "7", "2"], catalogue)).toEqual(["3", "5", "1", "7", "2"]);
  });

  it("rejects four or six ids", () => {
    expect(() => validateFeaturedIds(["1", "2", "3", "4"], catalogue)).toThrow(
      "Give exactly 5 different product ids",
    );
    expect(() => validateFeaturedIds(["1", "2", "3", "4", "5", "6"], catalogue)).toThrow(
      "Give exactly 5 different product ids",
    );
  });

  it("rejects the same id given twice", () => {
    expect(() => validateFeaturedIds(["1", "2", "3", "4", "4"], catalogue)).toThrow(
      "Give exactly 5 different product ids",
    );
  });

  it("rejects ids the catalogue does not have, naming each one", () => {
    expect(() => validateFeaturedIds(["1", "2", "3", "98", "99"], catalogue)).toThrow(
      "Unknown product ids: 98, 99",
    );
  });
});
