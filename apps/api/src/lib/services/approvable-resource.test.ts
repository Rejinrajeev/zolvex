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

describe("ApprovableResourceService mass-assignment protection", () => {
  it("strips workflow-control fields from create() and update() data before writing", async () => {
    const created = await services.create(
      { id: editorId, role: "editor" },
      {
        name: "Pool Cleaning",
        slug: "pool-cleaning",
        shortDescription: "s",
        fullDescription: "f",
        approvalStatus: "published",
        submittedBy: "attacker-id",
        approvedBy: "attacker-id",
        approvedAt: new Date().toISOString(),
        rejectionReason: "hacked",
        deletedAt: new Date().toISOString(),
      }
    );

    expect(created.approvalStatus).toBe("pending_approval");
    expect(created.submittedBy).toBe(editorId);
    expect(created.approvedBy).toBeNull();
    expect(created.approvedAt).toBeNull();
    expect(created.rejectionReason).toBeNull();
    expect(created.deletedAt).toBeNull();

    const updated = await services.update({ id: editorId, role: "editor" }, created.id, {
      name: "Pool Cleaning Updated",
      approvedBy: superadminId,
      approvedAt: new Date().toISOString(),
      approvalStatus: "published",
      deletedAt: new Date().toISOString(),
    });

    expect(updated.name).toBe("Pool Cleaning Updated");
    expect(updated.approvalStatus).toBe("pending_approval");
    expect(updated.approvedBy).toBeNull();
    expect(updated.deletedAt).toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { entityId: created.id, action: "create" },
    });
    expect((logs[0].diff as { after: { approvedBy: string | null } }).after.approvedBy).toBeNull();
  });
});

describe("ApprovableResourceService.softDelete / restore", () => {
  it("soft-deletes, then restores cleanly when no slug conflict exists", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Window Cleaning", slug: "window-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    const deleted = await services.softDelete({ id: superadminId, role: "superadmin" }, record.id);
    expect(deleted.deletedAt).not.toBeNull();

    const restored = await services.restore({ id: superadminId, role: "superadmin" }, record.id);
    expect(restored.deletedAt).toBeNull();
  });

  it("refuses to restore when another live record has taken the same slug", async () => {
    const original = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.softDelete({ id: superadminId, role: "superadmin" }, original.id);

    await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "New Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s2", fullDescription: "f2" }
    );

    await expect(
      services.restore({ id: superadminId, role: "superadmin" }, original.id)
    ).rejects.toThrow(SlugConflictError);
  });
});

describe("ApprovableResourceService.approve / reject", () => {
  it("approve() publishes a pending record and writes a publish audit row", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Office Cleaning", slug: "office-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    expect(record.approvalStatus).toBe("pending_approval");

    const approved = await services.approve({ id: superadminId, role: "superadmin" }, record.id);
    expect(approved.approvalStatus).toBe("published");
    expect(approved.approvedBy).toBe(superadminId);

    const logs = await prisma.auditLog.findMany({
      where: { entityId: record.id, action: "publish" },
    });
    expect(logs).toHaveLength(1);
  });

  it("reject() requires a non-empty reason and records it", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Gutter Cleaning", slug: "gutter-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.reject({ id: superadminId, role: "superadmin" }, record.id, "")
    ).rejects.toThrow(/rejectionReason is required/);

    const rejected = await services.reject(
      { id: superadminId, role: "superadmin" },
      record.id,
      "Photo quality too low"
    );
    expect(rejected.approvalStatus).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Photo quality too low");
  });

  it("refuses approve()/reject() from a non-superadmin actor", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Roof Cleaning", slug: "roof-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.approve({ id: editorId, role: "editor" }, record.id)
    ).rejects.toThrow(/Only superadmin/);

    await expect(
      services.reject({ id: editorId, role: "editor" }, record.id, "no")
    ).rejects.toThrow(/Only superadmin/);
  });

  it("refuses to approve/reject a record that isn't pending_approval", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Driveway Cleaning", slug: "driveway-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    expect(record.approvalStatus).toBe("published");

    await expect(
      services.approve({ id: superadminId, role: "superadmin" }, record.id)
    ).rejects.toThrow(/not pending approval/);

    await expect(
      services.reject({ id: superadminId, role: "superadmin" }, record.id, "reason")
    ).rejects.toThrow(/not pending approval/);
  });
});
