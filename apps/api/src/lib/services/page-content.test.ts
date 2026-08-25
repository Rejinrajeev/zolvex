import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PageContentService } from "./page-content.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const pages = new PageContentService(prisma);

let editorId: string;
let superadminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor3@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "super3@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.pageContent.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("PageContentService", () => {
  it("returns null for a pageKey that has never been set", async () => {
    const result = await pages.get("hero");
    expect(result).toBeNull();
  });

  it("lets a superadmin set page content and writes an audit row", async () => {
    const record = await pages.set(
      { id: superadminId, role: "superadmin" },
      "hero",
      { headline: "Commercial cleaning you can set your clock to." }
    );

    expect(record.pageKey).toBe("hero");
    expect(record.data).toEqual({ headline: "Commercial cleaning you can set your clock to." });

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("PageContent");
  });

  it("upserts on a second call for the same pageKey", async () => {
    await pages.set({ id: superadminId, role: "superadmin" }, "hero", { headline: "v1" });
    const updated = await pages.set({ id: superadminId, role: "superadmin" }, "hero", { headline: "v2" });

    expect(updated.data).toEqual({ headline: "v2" });
    const all = await prisma.pageContent.findMany({ where: { pageKey: "hero" } });
    expect(all).toHaveLength(1);
  });

  it("rejects an editor trying to set page content", async () => {
    await expect(
      pages.set({ id: editorId, role: "editor" }, "footer", { whatsapp: "+1..." })
    ).rejects.toThrow();
  });
});
