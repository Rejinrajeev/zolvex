/**
 * Splits a string into everything up to (and including trailing whitespace
 * before) its last word, and the last word itself. Used so the Hero
 * headline's gold underline flourish can apply to whatever the actual last
 * word of an admin-edited headline is, instead of a hand-drawn SVG path
 * hardcoded under the literal word "clock".
 */
export function splitLastWord(text: string): { rest: string; last: string } {
  const lastSpaceIndex = text.lastIndexOf(" ");
  if (lastSpaceIndex === -1) {
    return { rest: "", last: text };
  }
  return { rest: text.slice(0, lastSpaceIndex + 1), last: text.slice(lastSpaceIndex + 1) };
}
