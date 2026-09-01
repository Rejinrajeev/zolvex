import { describe, it, expect } from "vitest";
import { asString } from "./coerce";

describe("asString", () => {
  it("passes a string through unchanged", () => {
    expect(asString("hello")).toBe("hello");
  });

  it("returns undefined for a number", () => {
    expect(asString(971501234567)).toBeUndefined();
  });

  it("returns undefined for an object", () => {
    expect(asString({ foo: "bar" })).toBeUndefined();
  });

  it("returns undefined for an array", () => {
    expect(asString(["a", "b"])).toBeUndefined();
  });

  it("returns undefined for a boolean", () => {
    expect(asString(true)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(asString(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(asString(undefined)).toBeUndefined();
  });
});
