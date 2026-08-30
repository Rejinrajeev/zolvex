import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PlaceService } from "./place.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const places = new PlaceService(prisma);

let editorId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor2@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.place.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("PlaceService", () => {
  it("creates a place immediately (no approval queue) and writes an audit row", async () => {
    const record = await places.create({ id: editorId, role: "editor" }, { name: "Downtown" });

    expect(record.name).toBe("Downtown");
    expect(record.isActive).toBe(true);

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("Place");
    expect(logs[0].action).toBe("create");
  });

  it("soft-deletes and restores", async () => {
    const record = await places.create({ id: editorId, role: "editor" }, { name: "Uptown" });

    const deleted = await places.softDelete({ id: editorId, role: "editor" }, record.id);
    expect(deleted.deletedAt).not.toBeNull();

    const restored = await places.restore({ id: editorId, role: "editor" }, record.id);
    expect(restored.deletedAt).toBeNull();
  });

  it("rejects operating on an already-deleted place", async () => {
    const record = await places.create({ id: editorId, role: "editor" }, { name: "Eastside" });
    await places.softDelete({ id: editorId, role: "editor" }, record.id);

    await expect(places.softDelete({ id: editorId, role: "editor" }, record.id)).rejects.toThrow();
  });
});
