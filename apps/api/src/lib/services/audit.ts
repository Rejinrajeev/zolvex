/**
 * Shared audit-log writer, extracted from ApprovableResourceService so
 * non-approvable-workflow services (Place, PageContent, Admin user
 * management) can still write a real AuditLog row inside their own
 * transaction. See approvable-resource.ts's header comment for why this is
 * an explicit in-transaction write rather than a Prisma middleware.
 */
import type { AuditAction } from "@prisma/client";

export type AuditDiff = Record<string, { old: unknown; new: unknown }>;

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Build a per-field `{field: {old, new}}` diff of exactly what changed.
 * `before` is null for creates, in which case every field of the new record
 * is reported with `old: null`.
 */
export function buildAuditDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
): AuditDiff {
  const diff: AuditDiff = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  for (const key of keys) {
    const old = before ? (before[key] ?? null) : null;
    const next = after[key] ?? null;
    if (before && sameValue(old, next)) continue;
    diff[key] = { old, new: next };
  }
  return diff;
}

/**
 * The single place an AuditLog row is written. MUST be called with the `tx`
 * from the caller's own `$transaction` — the audit row has to commit or
 * roll back atomically with the content write, never separately.
 */
export async function writeAuditRow(
  tx: any,
  params: {
    entity: string;
    entityId: string;
    action: AuditAction;
    actorId: string;
    ipAddress?: string;
    diff: AuditDiff;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      adminId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      diff: params.diff,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
