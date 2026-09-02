import { describe, it, expect } from "vitest";
import { iconForServiceKey } from "./service-icons.js";
import { IconHome, IconOffice, IconCarpet, IconSanitize } from "@/components/icons";

describe("iconForServiceKey", () => {
  it("maps each known key to its icon", () => {
    expect(iconForServiceKey("office")).toBe(IconOffice);
    expect(iconForServiceKey("carpet")).toBe(IconCarpet);
    expect(iconForServiceKey("sanitize")).toBe(IconSanitize);
    expect(iconForServiceKey("home")).toBe(IconHome);
  });

  it("falls back to IconHome for an unrecognized key", () => {
    expect(iconForServiceKey("not-a-real-key")).toBe(IconHome);
  });

  it("falls back to IconHome for a blank/missing key", () => {
    expect(iconForServiceKey(undefined)).toBe(IconHome);
    expect(iconForServiceKey(null)).toBe(IconHome);
    expect(iconForServiceKey("")).toBe(IconHome);
  });

  it("avoids prototype pollution for Object.prototype property names", () => {
    // Keys that would collide with Object.prototype should still return DEFAULT_ICON
    expect(iconForServiceKey("constructor")).toBe(IconHome);
    expect(iconForServiceKey("toString")).toBe(IconHome);
    expect(iconForServiceKey("__proto__")).toBe(IconHome);
  });
});
