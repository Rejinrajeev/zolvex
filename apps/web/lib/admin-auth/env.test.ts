import { describe, it, expect, afterEach } from "vitest";
import { getApiBaseUrl } from "./env.js";

const original = process.env.API_BASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.API_BASE_URL;
  else process.env.API_BASE_URL = original;
});

describe("getApiBaseUrl", () => {
  it("returns the configured value", () => {
    process.env.API_BASE_URL = "http://localhost:4000";
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });

  it("throws a clear error when unset", () => {
    delete process.env.API_BASE_URL;
    expect(() => getApiBaseUrl()).toThrow(/API_BASE_URL/);
  });
});
