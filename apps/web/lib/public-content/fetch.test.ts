import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.API_BASE_URL = "http://test-backend.internal";

const { getPublicContent, getPageContent, getPublicPlaces } = await import("./fetch.js");

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getPublicContent", () => {
  it("returns the parsed array on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ id: "1" }]), { status: 200 })
    );
    const result = await getPublicContent("faq");
    expect(result).toEqual([{ id: "1" }]);
  });

  it("requests the correct URL with the revalidate option", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
    await getPublicContent("faq");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://test-backend.internal/api/content/faq");
    expect((init as { next?: { revalidate: number } })?.next?.revalidate).toBe(90);
  });

  it("returns an empty array on a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });

  it("returns an empty array when fetch itself rejects (network error)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the response body isn't valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not json", { status: 200 }));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the parsed JSON is a non-array object", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the parsed JSON is a non-array string", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('"oops"', { status: 200 }));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });
});

describe("getPublicPlaces", () => {
  it("returns the parsed array and requests the right URL", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([{ id: "1", name: "Downtown" }]), { status: 200 }));
    const result = await getPublicPlaces();
    expect(result).toEqual([{ id: "1", name: "Downtown" }]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://test-backend.internal/api/places");
  });

  it("returns an empty array on a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
    expect(await getPublicPlaces()).toEqual([]);
  });

  it("returns an empty array when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    expect(await getPublicPlaces()).toEqual([]);
  });
});

describe("getPageContent", () => {
  it("returns the parsed data on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { headline: "Hi" } }), { status: 200 })
    );
    const result = await getPageContent("hero");
    expect(result).toEqual({ headline: "Hi" });
  });

  it("returns null on a 404 (not yet configured)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));
    const result = await getPageContent("hero");
    expect(result).toBeNull();
  });

  it("returns null when fetch itself rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const result = await getPageContent("hero");
    expect(result).toBeNull();
  });
});
