import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AdminUserService } from "./admin-user.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const users = new AdminUserService(prisma);

let superadminId: string;
let editorId: string;

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedActors() {
  const superadmin = await prisma.admin.create({
    data: { name: "Boss", email: "boss@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "ed@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
}

describe("AdminUserService.create", () => {
  it("creates a new admin with a one-time temp password and writes an audit row", async () => {
    await seedActors();
    const result = await users.create(
      { id: superadminId, role: "superadmin" },
      { name: "New Editor", email: "new-editor@zolvex.test", role: "editor" }
    );

    expect(result.admin.email).toBe("new-editor@zolvex.test");
    expect(result.admin.twoFAEnabled).toBe(false);
    expect(result.tempPassword).toBeTruthy();
    expect(result.admin.passwordHash).not.toBe(result.tempPassword);

    const logs = await prisma.auditLog.findMany({ where: { entityId: result.admin.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("Admin");
  });

  it("rejects a non-superadmin creating an account", async () => {
    await seedActors();
    await expect(
      users.create({ id: editorId, role: "editor" }, { name: "X", email: "x@zolvex.test", role: "editor" })
    ).rejects.toThrow();
  });
});

describe("AdminUserService.setActive / changeRole", () => {
  it("deactivates and reactivates an account", async () => {
    await seedActors();
    const deactivated = await users.setActive({ id: superadminId, role: "superadmin" }, editorId, false);
    expect(deactivated.isActive).toBe(false);

    const reactivated = await users.setActive({ id: superadminId, role: "superadmin" }, editorId, true);
    expect(reactivated.isActive).toBe(true);
  });

  it("changes an account's role", async () => {
    await seedActors();
    const updated = await users.changeRole({ id: superadminId, role: "superadmin" }, editorId, "superadmin");
    expect(updated.role).toBe("superadmin");
  });
});
