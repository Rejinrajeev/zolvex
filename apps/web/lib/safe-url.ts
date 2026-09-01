/**
 * Returns the URL unchanged if it's http(s), or a safe "#" fallback
 * otherwise. Admin-entered URL fields (BlogPost.instagramUrl,
 * InstagramPost.permalink, PageContent's footer/google-review URLs) are
 * validated with Zod's .url() server-side, but .url() accepts ANY
 * syntactically valid URL per the WHATWG spec -- including
 * javascript:/data:/vbscript: schemes. A compromised or malicious admin
 * account could use one of those to store a stored-XSS link that executes
 * when a site visitor clicks it. This is a second, independent layer of
 * defense at render time, not a replacement for server-side validation.
 */
export function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // fall through to the safe default
  }
  return "#";
}
