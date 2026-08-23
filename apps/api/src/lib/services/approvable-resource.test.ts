import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ApprovableResourceService, SlugConflictError } from "./approvable-resource.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

const services = new ApprovableResourceService(prisma, "Service", "service");

let editorId: string;
let superadminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "super@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.service.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("ApprovableResourceService.create", () => {
  it("saves an editor's create as pending_approval and writes one audit row", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Deep Cleaning", slug: "deep-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    expect(record.approvalStatus).toBe("pending_approval");
    expect(record.submittedBy).toBe(editorId);

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("create");
    expect(logs[0].adminId).toBe(editorId);
  });

  it("saves a superadmin's create as published directly, no approval queue", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Carpet Cleaning", slug: "carpet-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    expect(record.approvalStatus).toBe("published");
  });
});
