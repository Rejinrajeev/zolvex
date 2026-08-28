import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../auth/crypto.js";
import { listAuditLog } from "./audit-log.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

let adminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const admin = await prisma.admin.create({
    data: { name: "A", email: "audit-log-svc@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
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

describe("listAuditLog", () => {
  it("returns rows newest-first with no filter", async () => {
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Faq", entityId: "x", diff: {} } });
    await prisma.auditLog.create({ data: { adminId, action: "update", entity: "Faq", entityId: "x", diff: {} } });

    const results = await listAuditLog(prisma);
    expect(results).toHaveLength(2);
    expect(results[0].action).toBe("update"); // most recent first
  });

  it("filters by entity", async () => {
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Faq", entityId: "x", diff: {} } });
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Service", entityId: "y", diff: {} } });

    const results = await listAuditLog(prisma, { entity: "Service" });
    expect(results).toHaveLength(1);
    expect(results[0].entity).toBe("Service");
  });

  it("filters by adminId", async () => {
    const other = await prisma.admin.create({
      data: { name: "B", email: "audit-log-other@zolvex.test", passwordHash: "x", role: "editor" },
    });
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Faq", entityId: "x", diff: {} } });
    await prisma.auditLog.create({ data: { adminId: other.id, action: "create", entity: "Faq", entityId: "y", diff: {} } });

    const results = await listAuditLog(prisma, { adminId });
    expect(results).toHaveLength(1);
    expect(results[0].adminId).toBe(adminId);
  });
});
