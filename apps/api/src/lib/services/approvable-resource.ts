import type { PrismaClient } from "@prisma/client";

export class SlugConflictError extends Error {}

export interface Actor {
  id: string;
  role: "superadmin" | "editor";
}

type DelegateName = "service" | "blogPost" | "testimonial" | "faq" | "place";

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

    return this.prisma.$transaction(async (tx) => {
      const record = await this.delegate(tx).create({
        data: { ...data, approvalStatus, submittedBy: actor.id },
      });
      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "create",
          entity: this.entityName,
          entityId: record.id,
          diff: { after: data },
        },
      });
      return record;
    });
  }

  async update(actor: Actor, id: string, data: Record<string, unknown>) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);

      const approvalStatus = this.statusFor(actor);
      const record = await this.delegate(tx).update({
        where: { id },
        data: { ...data, approvalStatus, submittedBy: actor.id },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "update",
          entity: this.entityName,
          entityId: id,
          diff: { before, after: data },
        },
      });
      return record;
    });
  }
}
