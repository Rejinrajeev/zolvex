import type { PrismaClient, AdminRole } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";
import { hashPassword, generateTempPassword } from "../auth/crypto.js";

export class AdminUserService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, twoFAEnabled: true, lastLogin: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(actor: Actor, data: { name: string; email: string; role: AdminRole }) {
    if (actor.role !== "superadmin") throw new Error("Only superadmin can create admin accounts");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const admin = await this.prisma.$transaction(async (tx) => {
      const created = await tx.admin.create({ data: { ...data, passwordHash } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: created.id,
        action: "create",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(null, { name: created.name, email: created.email, role: created.role }),
      });
      return created;
    });

    // tempPassword returned in plaintext exactly once; never stored or logged plaintext again.
    return { admin, tempPassword };
  }

  async setActive(actor: Actor, id: string, isActive: boolean) {
    if (actor.role !== "superadmin") throw new Error("Only superadmin can change account status");

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.admin.findUnique({ where: { id } });
      if (!before) throw new Error(`Admin ${id} not found`);

      const record = await tx.admin.update({ where: { id }, data: { isActive } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff({ isActive: before.isActive }, { isActive: record.isActive }),
      });
      return record;
    });
  }

  async changeRole(actor: Actor, id: string, role: AdminRole) {
    if (actor.role !== "superadmin") throw new Error("Only superadmin can change roles");

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.admin.findUnique({ where: { id } });
      if (!before) throw new Error(`Admin ${id} not found`);

      const record = await tx.admin.update({ where: { id }, data: { role } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff({ role: before.role }, { role: record.role }),
      });
      return record;
    });
  }
}
