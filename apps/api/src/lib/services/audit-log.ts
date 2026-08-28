import type { PrismaClient } from "@prisma/client";

export async function listAuditLog(
  prisma: PrismaClient,
  filter?: { entity?: string; adminId?: string; from?: Date; to?: Date }
) {
  const where: Record<string, unknown> = {};
  if (filter?.entity) where.entity = filter.entity;
  if (filter?.adminId) where.adminId = filter.adminId;
  if (filter?.from || filter?.to) {
    where.timestamp = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }
  return prisma.auditLog.findMany({ where, orderBy: { timestamp: "desc" } });
}
