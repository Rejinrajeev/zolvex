/**
 * ApprovableResourceService — shared create/update/soft-delete/restore/approve/
 * reject workflow for the approvable content types (Service, BlogPost,
 * Testimonial, Faq), with a transactional audit-log write on every mutation.
 *
 * -------------------------------------------------------------------------
 * DEVIATION FROM THE ORIGINAL SPEC — audit-log implementation
 * -------------------------------------------------------------------------
 * The Foundation spec described "one Prisma middleware [that] auto-writes the
 * audit-log row on every covered write". This implementation instead writes the
 * audit row EXPLICITLY inside each service method, in the same interactive
 * `$transaction` as the content write.
 *
 * Why: a Prisma middleware/extension cannot cleanly join the caller's
 * interactive transaction (so the audit row could be committed even when the
 * content write rolls back, or vice versa), and it has no way to know WHICH
 * admin is acting — the acting identity has to be threaded in from the request
 * anyway. Explicit in-service writes give a real all-or-nothing guarantee.
 *
 * IMPLICATION — read this before writing any route handler:
 * The guarantee changes from "every write to these tables is audited" to
 * "every write that goes THROUGH THIS SERVICE is audited". Any code that
 * writes to Service / BlogPost / Testimonial / Faq / Place directly via Prisma
 * (`prisma.service.update(...)`, `prisma.faq.create(...)`, raw SQL, …) bypasses
 * BOTH the audit log AND the approval-workflow enforcement, producing an
 * untracked, unreviewed change.
 *
 * Therefore: Gate 1 / Gate 2 route handlers MUST go through this service for
 * all mutations of these entities. Never call `prisma.<entity>.create/update/
 * delete()` directly from a handler. (Reads are fine — see
 * `publicVisibilityWhere` below for the standard public-read filter.)
 *
 * -------------------------------------------------------------------------
 * INPUT-VALIDATION CONTRACT
 * -------------------------------------------------------------------------
 * `stripWorkflowFields` is a DENYLIST: it removes known workflow-control fields
 * from caller-supplied data. It is NOT an allowlist and does not validate types
 * or unknown fields. Callers MUST validate + allowlist request bodies (Zod) at
 * the HTTP layer before calling `create()` / `update()`. Never pass a raw
 * `req.body` into this service. Tracked in TODOS.md ("Denylist field-strip
 * depends on an HTTP-layer allowlist").
 */
import type { Prisma, PrismaClient, ApprovalStatus } from "@prisma/client";
import { writeAuditRow, buildAuditDiff, type AuditDiff } from "./audit.js";

export { buildAuditDiff, type AuditDiff } from "./audit.js";

export class SlugConflictError extends Error {}
export class RecordNotFoundError extends Error {}
export class ForbiddenActionError extends Error {}
export class InvalidStateError extends Error {}

export interface Actor {
  id: string;
  role: "superadmin" | "editor";
  /**
   * Optional client IP of the acting admin, recorded on the audit row.
   * Nothing supplies this yet (no HTTP layer); it lives here so adding it in
   * Gate 1/2 is not a breaking six-method signature change.
   */
  ipAddress?: string;
}

/**
 * The single source of truth for "visible to the public".
 *
 * Use this (spread into a Prisma `where`) for every public-facing read so no
 * route can forget `deletedAt: null` and leak trashed content:
 *
 *     prisma.service.findMany({ where: { ...publicVisibilityWhere } })
 *     prisma.faq.findFirst({ where: { ...publicVisibilityWhere, id } })
 */
export const publicVisibilityWhere = {
  approvalStatus: "published",
  deletedAt: null,
  isActive: true,
} as const satisfies Prisma.ServiceWhereInput &
  Prisma.BlogPostWhereInput &
  Prisma.TestimonialWhereInput &
  Prisma.FaqWhereInput &
  Prisma.InstagramPostWhereInput;

// "place" is deliberately excluded: Place has no approvalStatus/submittedBy/
// approvedBy/approvedAt/rejectionReason columns and is not part of the
// approval workflow (same as pageContent). It gets its own simple
// non-approval CRUD handling in a later Gate task.
//
// `entityName` (the string written to AuditLog.entity) is derived from this map
// rather than passed in by the caller, so a typo like "Srevice" can't silently
// poison every audit row for an entity.
const ENTITY_NAMES = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
  instagramPost: "InstagramPost",
} as const;

type DelegateName = keyof typeof ENTITY_NAMES;

// The one free-text-searchable column per type, used by list()'s `search` filter.
const SEARCH_FIELDS: Record<DelegateName, string> = {
  service: "name",
  blogPost: "title",
  testimonial: "name",
  faq: "question",
  instagramPost: "permalink",
};

// Not every delegate has an `order` column — `Testimonial` doesn't (confirmed
// against schema.prisma; the spec's claim that "all five types have an order
// field" is wrong for this one, ground truth over intention, same as the
// Plan 1 spec's own documented Place correction). list() falls back to
// createdAt for these, and reorder() refuses them outright with a clear
// error instead of letting Prisma throw an opaque "Unknown argument" error.
const ORDERABLE: Partial<Record<DelegateName, true>> = {
  service: true,
  blogPost: true,
  faq: true,
  instagramPost: true,
};

const WORKFLOW_FIELDS = [
  "id",
  "approvalStatus",
  "submittedBy",
  "approvedBy",
  "approvedAt",
  "rejectionReason",
  "deletedAt",
  "createdAt",
  "updatedAt",
] as const;

function stripWorkflowFields(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };
  for (const field of WORKFLOW_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/**
 * Translate a Prisma P2002 (unique constraint) failure on `slug` into the
 * domain-level SlugConflictError, so callers get one consistent error type from
 * create()/update()/restore() instead of a raw Prisma error from two of them.
 *
 * The live-slug constraint is the hand-written partial unique index
 * `Service_slug_live_key` (see schema.prisma), so `meta.target` may carry the
 * index name rather than a column list — both are matched below.
 */
function isSlugUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; meta?: { target?: unknown }; message?: unknown };
  if (e.code !== "P2002") return false;
  const target = Array.isArray(e.meta?.target) ? e.meta.target.join(",") : String(e.meta?.target ?? "");
  const haystack = `${target} ${String(e.message ?? "")}`;
  return /slug/i.test(haystack);
}

export class ApprovableResourceService {
  private entityName: string;

  constructor(
    private prisma: PrismaClient,
    private delegateName: DelegateName
  ) {
    this.entityName = ENTITY_NAMES[delegateName];
  }

  private delegate(tx: any) {
    return tx[this.delegateName];
  }

  private statusFor(actor: Actor): "published" | "pending_approval" {
    return actor.role === "superadmin" ? "published" : "pending_approval";
  }

  private assertNotDeleted(before: { deletedAt?: Date | null }, id: string) {
    if (before.deletedAt) {
      throw new InvalidStateError(
        `Cannot operate on ${this.entityName} ${id}: record is soft-deleted (restore it first)`
      );
    }
  }

  /**
   * NOTE: there is intentionally NO ownership check here or in update() — any
   * editor may edit any other editor's submission. Acceptable for a small,
   * trusted editorial team; revisit if the team grows or roles get finer.
   * Also NOTE: `data` is denylist-filtered, not allowlist-validated — see the
   * INPUT-VALIDATION CONTRACT at the top of this file.
   */
  async create(actor: Actor, data: Record<string, unknown>) {
    const approvalStatus = this.statusFor(actor);
    const cleanData = stripWorkflowFields(data);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const record = await this.delegate(tx).create({
          data: { ...cleanData, approvalStatus, submittedBy: actor.id },
        });
        await writeAuditRow(tx, {
          entity: this.entityName,
          actorId: actor.id,
          ipAddress: actor.ipAddress,
          action: "create",
          entityId: record.id,
          diff: buildAuditDiff(null, record),
        });
        return record;
      });
    } catch (error) {
      if (isSlugUniqueViolation(error)) {
        throw new SlugConflictError(
          `Cannot create ${this.entityName}: slug "${String(cleanData.slug)}" is already in use by a live record`
        );
      }
      throw error;
    }
  }

  /** See the ownership / validation notes on create(). */
  async update(actor: Actor, id: string, data: Record<string, unknown>) {
    const cleanData = stripWorkflowFields(data);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await this.delegate(tx).findUnique({ where: { id } });
        if (!before) throw new RecordNotFoundError(`${this.entityName} ${id} not found`);
        this.assertNotDeleted(before, id);

        const approvalStatus = this.statusFor(actor);
        // Re-entering the approval queue must not carry stale metadata from a
        // previous approval/rejection cycle (an old rejectionReason shown next
        // to a freshly-submitted edit is actively misleading).
        const approvalReset =
          approvalStatus === "pending_approval"
            ? { rejectionReason: null, approvedBy: null, approvedAt: null }
            : {};

        const record = await this.delegate(tx).update({
          where: { id },
          data: { ...cleanData, approvalStatus, submittedBy: actor.id, ...approvalReset },
        });

        await writeAuditRow(tx, {
          entity: this.entityName,
          actorId: actor.id,
          ipAddress: actor.ipAddress,
          action: "update",
          entityId: id,
          diff: buildAuditDiff(before, record),
        });
        return record;
      });
    } catch (error) {
      if (isSlugUniqueViolation(error)) {
        throw new SlugConflictError(
          `Cannot update ${this.entityName} ${id}: slug "${String(cleanData.slug)}" is already in use by a live record`
        );
      }
      throw error;
    }
  }

  async softDelete(actor: Actor, id: string) {
    if (actor.role !== "superadmin") {
      throw new ForbiddenActionError("Only superadmin can delete/restore");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new RecordNotFoundError(`${this.entityName} ${id} not found`);
      if (before.deletedAt) throw new InvalidStateError(`${this.entityName} ${id} already deleted`);

      const record = await this.delegate(tx).update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await writeAuditRow(tx, {
        entity: this.entityName,
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        action: "delete",
        entityId: id,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async restore(actor: Actor, id: string) {
    if (actor.role !== "superadmin") {
      throw new ForbiddenActionError("Only superadmin can delete/restore");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new RecordNotFoundError(`${this.entityName} ${id} not found`);
      if (!before.deletedAt) throw new InvalidStateError(`${this.entityName} ${id} is not deleted`);

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

      await writeAuditRow(tx, {
        entity: this.entityName,
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        action: "restore",
        entityId: id,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async approve(actor: Actor, id: string) {
    if (actor.role !== "superadmin") {
      throw new ForbiddenActionError("Only superadmin can approve/reject");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new RecordNotFoundError(`${this.entityName} ${id} not found`);
      this.assertNotDeleted(before, id);
      if (before.approvalStatus !== "pending_approval") {
        throw new InvalidStateError(
          `Cannot approve ${this.entityName} ${id}: not pending approval (current status: ${before.approvalStatus})`
        );
      }

      const record = await this.delegate(tx).update({
        where: { id },
        data: { approvalStatus: "published", approvedBy: actor.id, approvedAt: new Date() },
      });

      await writeAuditRow(tx, {
        entity: this.entityName,
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        action: "publish",
        entityId: id,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async reject(actor: Actor, id: string, reason: string) {
    if (actor.role !== "superadmin") {
      throw new ForbiddenActionError("Only superadmin can approve/reject");
    }
    if (!reason || reason.trim().length === 0) {
      throw new InvalidStateError("rejectionReason is required");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new RecordNotFoundError(`${this.entityName} ${id} not found`);
      this.assertNotDeleted(before, id);
      if (before.approvalStatus !== "pending_approval") {
        throw new InvalidStateError(
          `Cannot reject ${this.entityName} ${id}: not pending approval (current status: ${before.approvalStatus})`
        );
      }

      const record = await this.delegate(tx).update({
        where: { id },
        data: { approvalStatus: "rejected", rejectionReason: reason },
      });

      await writeAuditRow(tx, {
        entity: this.entityName,
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        action: "reject",
        entityId: id,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  /**
   * `status` is typed as the ApprovalStatus enum, not `string`: it lands
   * verbatim in a Prisma `approvalStatus` filter, which throws
   * PrismaClientValidationError for anything outside the enum. Keeping the
   * narrow type here makes the HTTP layer's validation a compile-time
   * obligation rather than a convention a future caller can forget.
   */
  async list(filter?: { status?: ApprovalStatus; search?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter?.status) where.approvalStatus = filter.status;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    if (filter?.search) {
      where[SEARCH_FIELDS[this.delegateName]] = { contains: filter.search, mode: "insensitive" };
    }
    const orderBy = ORDERABLE[this.delegateName] ? { order: "asc" as const } : { createdAt: "desc" as const };
    return this.delegate(this.prisma).findMany({ where, orderBy });
  }

  async reorder(actor: Actor, items: { id: string; order: number }[]) {
    if (!ORDERABLE[this.delegateName]) {
      throw new InvalidStateError(`${this.entityName} does not support manual ordering`);
    }
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of items) {
        const before = await this.delegate(tx).findUnique({ where: { id: item.id } });
        if (!before) throw new RecordNotFoundError(`${this.entityName} ${item.id} not found`);
        // Same guard update()/approve()/reject() apply. Reordering a trashed
        // record would write a misleading audit row and leave it in a confusing
        // half-state; the whole batch rolls back instead.
        this.assertNotDeleted(before, item.id);

        const record = await this.delegate(tx).update({ where: { id: item.id }, data: { order: item.order } });
        await writeAuditRow(tx, {
          entity: this.entityName,
          actorId: actor.id,
          ipAddress: actor.ipAddress,
          action: "update",
          entityId: item.id,
          diff: buildAuditDiff({ order: before.order }, { order: record.order }),
        });
        results.push(record);
      }
      return results;
    });
  }
}
