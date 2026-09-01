import { describe, it, expect } from "vitest";
import { splitLastWord } from "./split-last-word.js";

describe("splitLastWord", () => {
  it("splits a multi-word string into everything-but-last and the last word", () => {
    expect(splitLastWord("Commercial cleaning you can set your clock to.")).toEqual({
      rest: "Commercial cleaning you can set your clock ",
      last: "to.",
    });
  });

  it("treats a single-word string as entirely the last word", () => {
    expect(splitLastWord("Hello")).toEqual({ rest: "", last: "Hello" });
  });

  it("treats an empty string as an empty last word", () => {
    expect(splitLastWord("")).toEqual({ rest: "", last: "" });
  });
});
