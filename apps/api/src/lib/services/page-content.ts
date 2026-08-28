import type { PrismaClient, Prisma } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";

export class PageContentService {
  constructor(private prisma: PrismaClient) {}

  async get(pageKey: string) {
    return this.prisma.pageContent.findUnique({ where: { pageKey } });
  }

  async set(actor: Actor, pageKey: string, data: Prisma.InputJsonValue) {
    if (actor.role !== "superadmin") {
      throw new Error("Only superadmin can edit page content");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.pageContent.findUnique({ where: { pageKey } });
      const record = await tx.pageContent.upsert({
        where: { pageKey },
        create: { pageKey, data, updatedBy: actor.id },
        update: { data, updatedBy: actor.id },
      });

      await writeAuditRow(tx, {
        entity: "PageContent",
        entityId: record.id,
        action: before ? "update" : "create",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }
}
