import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

let adminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const admin = await prisma.admin.create({
    data: { name: "Auditor", email: "auditor@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  adminId = admin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("buildAuditDiff", () => {
  it("reports every field as changed when before is null (create)", () => {
    const diff = buildAuditDiff(null, { name: "X", order: 1 });
    expect(diff).toEqual({ name: { old: null, new: "X" }, order: { old: null, new: 1 } });
  });

  it("only reports fields that actually changed", () => {
    const diff = buildAuditDiff({ name: "X", order: 1 }, { name: "X", order: 2 });
    expect(diff).toEqual({ order: { old: 1, new: 2 } });
  });
});

describe("writeAuditRow", () => {
  it("writes a row usable outside any specific entity's service", async () => {
    await prisma.$transaction(async (tx) => {
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: "fake-place-id",
        action: "create",
        actorId: adminId,
        diff: buildAuditDiff(null, { name: "Downtown" }),
      });
    });

    const rows = await prisma.auditLog.findMany({ where: { entity: "Place" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].entityId).toBe("fake-place-id");
  });
});
