import { describe, it, expect } from "vitest";
import { iconForServiceKey } from "./service-icons.js";
import { IconOffice, IconCarpet, IconSanitize } from "@/components/icons";

describe("iconForServiceKey", () => {
  it("maps each known key to its icon", () => {
    expect(iconForServiceKey("office")).toBe(IconOffice);
    expect(iconForServiceKey("carpet")).toBe(IconCarpet);
    expect(iconForServiceKey("sanitize")).toBe(IconSanitize);
  });

  it("falls back to IconOffice for an unrecognized key", () => {
    expect(iconForServiceKey("not-a-real-key")).toBe(IconOffice);
  });

  it("falls back to IconOffice for a blank/missing key", () => {
    expect(iconForServiceKey(undefined)).toBe(IconOffice);
    expect(iconForServiceKey(null)).toBe(IconOffice);
    expect(iconForServiceKey("")).toBe(IconOffice);
  });
});
