import type { PrismaClient } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";

/**
 * Place has no approvalStatus/submittedBy/approvedBy/rejectionReason
 * columns (see the DelegateName test in approvable-resource.test.ts) and
 * is not part of the approval workflow — any admin, editor or superadmin,
 * can add/edit/remove a service area immediately. Still audited, via the
 * same writeAuditRow every other service uses.
 */
export class PlaceService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.place.findMany({ where: { deletedAt: null }, orderBy: { order: "asc" } });
  }

  async create(actor: Actor, data: { name: string; order?: number; isActive?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.place.create({ data });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: record.id,
        action: "create",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(null, record),
      });
      return record;
    });
  }

  async update(actor: Actor, id: string, data: { name?: string; order?: number; isActive?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.place.findUnique({ where: { id } });
      if (!before) throw new Error(`Place ${id} not found`);
      if (before.deletedAt) throw new Error(`Place ${id} is soft-deleted (restore it first)`);

      const record = await tx.place.update({ where: { id }, data });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async softDelete(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.place.findUnique({ where: { id } });
      if (!before) throw new Error(`Place ${id} not found`);
      if (before.deletedAt) throw new Error(`Place ${id} already deleted`);

      const record = await tx.place.update({ where: { id }, data: { deletedAt: new Date() } });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: id,
        action: "delete",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async restore(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.place.findUnique({ where: { id } });
      if (!before) throw new Error(`Place ${id} not found`);
      if (!before.deletedAt) throw new Error(`Place ${id} is not deleted`);

      const record = await tx.place.update({ where: { id }, data: { deletedAt: null } });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: id,
        action: "restore",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }
}
