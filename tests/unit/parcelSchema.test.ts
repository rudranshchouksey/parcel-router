// tests/unit/parcelSchema.test.ts

import { describe, it, expect } from "vitest";
import { ParcelInputSchema } from "@/core/validation/parcelSchema";

describe("ParcelInputSchema — valid inputs", () => {
  it("accepts minimal valid parcel", () => {
    const result = ParcelInputSchema.safeParse({ weight: 2, value: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts parcel with all optional fields", () => {
    const result = ParcelInputSchema.safeParse({
      weight: 5,
      value: 500,
      destinationCountry: "NL",
      recipient: {
        name: "John Doe",
        address: { street: "Main St", city: "Amsterdam", postalCode: "1234AB" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly 1kg (Mail boundary)", () => {
    expect(ParcelInputSchema.safeParse({ weight: 1, value: 0 }).success).toBe(true);
  });

  it("accepts exactly 10kg (Regular boundary)", () => {
    expect(ParcelInputSchema.safeParse({ weight: 10, value: 0 }).success).toBe(true);
  });

  it("accepts value of exactly €1000 (insurance boundary)", () => {
    expect(ParcelInputSchema.safeParse({ weight: 2, value: 1000 }).success).toBe(true);
  });

  it("accepts value of 0", () => {
    expect(ParcelInputSchema.safeParse({ weight: 2, value: 0 }).success).toBe(true);
  });
});

describe("ParcelInputSchema — invalid inputs", () => {
  it("rejects missing weight", () => {
    const result = ParcelInputSchema.safeParse({ value: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects missing value", () => {
    const result = ParcelInputSchema.safeParse({ weight: 2 });
    expect(result.success).toBe(false);
  });

  it("rejects zero weight", () => {
    const result = ParcelInputSchema.safeParse({ weight: 0, value: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = ParcelInputSchema.safeParse({ weight: -1, value: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = ParcelInputSchema.safeParse({ weight: 2, value: -50 });
    expect(result.success).toBe(false);
  });

  it("rejects weight above maximum", () => {
    const result = ParcelInputSchema.safeParse({ weight: 99999, value: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects string weight", () => {
    const result = ParcelInputSchema.safeParse({ weight: "heavy", value: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects null body", () => {
    const result = ParcelInputSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = ParcelInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});