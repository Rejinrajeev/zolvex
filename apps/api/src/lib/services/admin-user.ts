import type { PrismaClient, AdminRole } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";
import { hashPassword, generateTempPassword } from "../auth/crypto.js";

/** Thrown when a non-superadmin actor attempts a superadmin-only admin-user operation. */
export class ForbiddenAdminActionError extends Error {}

/** Thrown when the target admin id doesn't exist. */
export class AdminNotFoundError extends Error {}

export class AdminUserService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, twoFAEnabled: true, lastLogin: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(actor: Actor, data: { name: string; email: string; role: AdminRole }) {
    if (actor.role !== "superadmin") throw new ForbiddenAdminActionError("Only superadmin can create admin accounts");

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
    if (actor.role !== "superadmin") throw new ForbiddenAdminActionError("Only superadmin can change account status");

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.admin.findUnique({ where: { id } });
      if (!before) throw new AdminNotFoundError(`Admin ${id} not found`);

      const record = await tx.admin.update({ where: { id }, data: { isActive } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff({ isActive: before.isActive }, { isActive: record.isActive }),
      });

      // Deactivating an admin must not leave their existing sessions usable --
      // otherwise a 15-minute access token they already hold keeps working at
      // the old privilege level until it naturally expires. Reactivating must
      // NOT revoke anything: it's not a security event and shouldn't force a
      // fresh login on top of whatever else the operator is doing.
      if (isActive === false) {
        await tx.adminSession.updateMany({
          where: { adminId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return record;
    });
  }

  async changeRole(actor: Actor, id: string, role: AdminRole) {
    if (actor.role !== "superadmin") throw new ForbiddenAdminActionError("Only superadmin can change roles");

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.admin.findUnique({ where: { id } });
      if (!before) throw new AdminNotFoundError(`Admin ${id} not found`);

      const record = await tx.admin.update({ where: { id }, data: { role } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff({ role: before.role }, { role: record.role }),
      });

      // Any role change must force re-login so the new role takes effect
      // immediately instead of only once the old access token expires.
      await tx.adminSession.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return record;
    });
  }
}
