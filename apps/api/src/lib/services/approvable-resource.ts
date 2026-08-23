import type { PrismaClient } from "@prisma/client";

export class SlugConflictError extends Error {}

export interface Actor {
  id: string;
  role: "superadmin" | "editor";
}

type DelegateName = "service" | "blogPost" | "testimonial" | "faq" | "place";

const WORKFLOW_FIELDS = [
  "id",
  "approvalStatus",
  "submittedBy",
  "approvedBy",
  "approvedAt",
  "rejectionReason",
  "deletedAt",
] as const;

function stripWorkflowFields(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };
  for (const field of WORKFLOW_FIELDS) {
    delete clean[field];
  }
  return clean;
}

export class ApprovableResourceService {
  constructor(
    private prisma: PrismaClient,
    private entityName: string,
    private delegateName: DelegateName
  ) {}

  private delegate(tx: any) {
    return tx[this.delegateName];
  }

  private statusFor(actor: Actor): "published" | "pending_approval" {
    return actor.role === "superadmin" ? "published" : "pending_approval";
  }

  async create(actor: Actor, data: Record<string, unknown>) {
    const approvalStatus = this.statusFor(actor);
    const cleanData = stripWorkflowFields(data);

    return this.prisma.$transaction(async (tx) => {
      const record = await this.delegate(tx).create({
        data: { ...cleanData, approvalStatus, submittedBy: actor.id },
      });
      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "create",
          entity: this.entityName,
          entityId: record.id,
          diff: { after: record },
        },
      });
      return record;
    });
  }

  async update(actor: Actor, id: string, data: Record<string, unknown>) {
    const cleanData = stripWorkflowFields(data);

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);

      const approvalStatus = this.statusFor(actor);
      const record = await this.delegate(tx).update({
        where: { id },
        data: { ...cleanData, approvalStatus, submittedBy: actor.id },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "update",
          entity: this.entityName,
          entityId: id,
          diff: { before, after: record },
        },
      });
      return record;
    });
  }

  async softDelete(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);
      if (before.deletedAt) throw new Error(`${this.entityName} ${id} already deleted`);

      const record = await this.delegate(tx).update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "delete",
          entity: this.entityName,
          entityId: id,
          diff: { before: { deletedAt: before.deletedAt }, after: { deletedAt: record.deletedAt } },
        },
      });
      return record;
    });
  }

  async restore(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);
      if (!before.deletedAt) throw new Error(`${this.entityName} ${id} is not deleted`);

      if ("slug" in before && before.slug) {
        const conflict = await this.delegate(tx).findFirst({
          where: { slug: before.slug, deletedAt: null, NOT: { id } },
        });
        if (conflict) {
          throw new SlugConflictError(
            `Cannot restore ${this.entityName} ${id}: slug "${before.slug}" is in use by ${conflict.id}`
          );
        }
      }

      const record = await this.delegate(tx).update({
        where: { id },
        data: { deletedAt: null },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "restore",
          entity: this.entityName,
          entityId: id,
          diff: { before: { deletedAt: before.deletedAt }, after: { deletedAt: null } },
        },
      });
      return record;
    });
  }

  async approve(actor: Actor, id: string) {
    if (actor.role !== "superadmin") {
      throw new Error("Only superadmin can approve/reject");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);
      if (before.approvalStatus !== "pending_approval") {
        throw new Error(
          `Cannot approve ${this.entityName} ${id}: not pending approval (current status: ${before.approvalStatus})`
        );
      }

      const record = await this.delegate(tx).update({
        where: { id },
        data: { approvalStatus: "published", approvedBy: actor.id, approvedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "publish",
          entity: this.entityName,
          entityId: id,
          diff: {
            before: { approvalStatus: before.approvalStatus },
            after: { approvalStatus: "published" },
          },
        },
      });
      return record;
    });
  }

  async reject(actor: Actor, id: string, reason: string) {
    if (actor.role !== "superadmin") {
      throw new Error("Only superadmin can approve/reject");
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error("rejectionReason is required");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);
      if (before.approvalStatus !== "pending_approval") {
        throw new Error(
          `Cannot reject ${this.entityName} ${id}: not pending approval (current status: ${before.approvalStatus})`
        );
      }

      const record = await this.delegate(tx).update({
        where: { id },
        data: { approvalStatus: "rejected", rejectionReason: reason },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "reject",
          entity: this.entityName,
          entityId: id,
          diff: {
            before: { approvalStatus: before.approvalStatus },
            after: { approvalStatus: "rejected", rejectionReason: reason },
          },
        },
      });
      return record;
    });
  }
}
