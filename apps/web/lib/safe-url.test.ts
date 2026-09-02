import { describe, it, expect } from "vitest";
import { safeHref } from "./safe-url";

describe("safeHref", () => {
  it("passes through a normal https:// URL unchanged", () => {
    const url = "https://instagram.com/example";
    expect(safeHref(url)).toBe(url);
  });

  it("passes through a normal http:// URL unchanged", () => {
    const url = "http://example.com";
    expect(safeHref(url)).toBe(url);
  });

  it("returns '#' for a javascript: URL", () => {
    expect(safeHref("javascript:alert(document.cookie)")).toBe("#");
  });

  it("returns '#' for a data: URL", () => {
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
  });

  it("returns '#' for a vbscript: URL", () => {
    expect(safeHref("vbscript:msgbox('xss')")).toBe("#");
  });

  it("returns '#' for an unparseable string", () => {
    expect(safeHref("not a url")).toBe("#");
  });

  it("returns '#' for null", () => {
    expect(safeHref(null)).toBe("#");
  });

  it("returns '#' for undefined", () => {
    expect(safeHref(undefined)).toBe("#");
  });

  it("returns '#' for empty string", () => {
    expect(safeHref("")).toBe("#");
  });
});
