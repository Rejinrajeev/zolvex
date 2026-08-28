import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  ApprovableResourceService,
  SlugConflictError,
  RecordNotFoundError,
  InvalidStateError,
  publicVisibilityWhere,
  type AuditDiff,
} from "./approvable-resource.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

const services = new ApprovableResourceService(prisma, "service");
const instagramPosts = new ApprovableResourceService(prisma, "instagramPost");
const faqs = new ApprovableResourceService(prisma, "faq");
const testimonials = new ApprovableResourceService(prisma, "testimonial");

let editorId: string;
let superadminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "super@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.service.deleteMany();
  await prisma.instagramPost.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.testimonial.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("ApprovableResourceService DelegateName", () => {
  it("does not allow 'place' as a delegate (Place has no approval workflow)", () => {
    // @ts-expect-error - "place" is intentionally excluded from DelegateName:
    // Place has no approvalStatus/submittedBy/approvedBy/approvedAt/
    // rejectionReason columns and is not part of the approval workflow.
    const placeAttempt = new ApprovableResourceService(prisma, "place");
    expect(placeAttempt).toBeInstanceOf(ApprovableResourceService);
  });
});

describe("ApprovableResourceService.create", () => {
  it("saves an editor's create as pending_approval and writes one audit row", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Deep Cleaning", slug: "deep-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    expect(record.approvalStatus).toBe("pending_approval");
    expect(record.submittedBy).toBe(editorId);

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("create");
    expect(logs[0].adminId).toBe(editorId);
  });

  it("saves a superadmin's create as published directly, no approval queue", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Carpet Cleaning", slug: "carpet-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    expect(record.approvalStatus).toBe("published");
  });
});

describe("ApprovableResourceService mass-assignment protection", () => {
  it("strips workflow-control fields from create() and update() data before writing", async () => {
    const created = await services.create(
      { id: editorId, role: "editor" },
      {
        name: "Pool Cleaning",
        slug: "pool-cleaning",
        shortDescription: "s",
        fullDescription: "f",
        approvalStatus: "published",
        submittedBy: "attacker-id",
        approvedBy: "attacker-id",
        approvedAt: new Date().toISOString(),
        rejectionReason: "hacked",
        deletedAt: new Date().toISOString(),
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2000-01-01T00:00:00.000Z",
      }
    );

    expect(created.approvalStatus).toBe("pending_approval");
    expect(created.submittedBy).toBe(editorId);
    expect(created.approvedBy).toBeNull();
    expect(created.approvedAt).toBeNull();
    expect(created.rejectionReason).toBeNull();
    expect(created.deletedAt).toBeNull();
    expect(created.createdAt.getFullYear()).toBeGreaterThan(2020);

    const updated = await services.update({ id: editorId, role: "editor" }, created.id, {
      name: "Pool Cleaning Updated",
      approvedBy: superadminId,
      approvedAt: new Date().toISOString(),
      approvalStatus: "published",
      deletedAt: new Date().toISOString(),
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
    });

    expect(updated.name).toBe("Pool Cleaning Updated");
    expect(updated.approvalStatus).toBe("pending_approval");
    expect(updated.approvedBy).toBeNull();
    expect(updated.deletedAt).toBeNull();
    expect(updated.createdAt.getFullYear()).toBeGreaterThan(2020);
    expect(updated.updatedAt.getFullYear()).toBeGreaterThan(2020);

    const logs = await prisma.auditLog.findMany({
      where: { entityId: created.id, action: "create" },
    });
    const diff = logs[0].diff as AuditDiff;
    expect(diff.approvedBy).toEqual({ old: null, new: null });
    expect(diff.submittedBy).toEqual({ old: null, new: editorId });
    expect(diff.approvalStatus).toEqual({ old: null, new: "pending_approval" });
  });
});

describe("audit diff shape", () => {
  it("records a per-field {old, new} diff of exactly what changed on update()", async () => {
    const created = await services.create(
      { id: editorId, role: "editor" },
      { name: "Tile Cleaning", slug: "tile-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await services.update({ id: editorId, role: "editor" }, created.id, {
      name: "Tile & Grout Cleaning",
    });

    const [log] = await prisma.auditLog.findMany({
      where: { entityId: created.id, action: "update" },
    });
    const diff = log.diff as AuditDiff;

    expect(diff.name).toEqual({ old: "Tile Cleaning", new: "Tile & Grout Cleaning" });
    // Unchanged fields must be absent entirely (not dumped as whole records).
    expect(diff.slug).toBeUndefined();
    expect(diff.shortDescription).toBeUndefined();
    expect(diff.fullDescription).toBeUndefined();
    // No legacy before/after wrapper keys.
    expect(diff.before).toBeUndefined();
    expect(diff.after).toBeUndefined();
  });

  it("records a per-field diff for approve() and reject() too", async () => {
    const a = await services.create(
      { id: editorId, role: "editor" },
      { name: "Awning Cleaning", slug: "awning-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.approve({ id: superadminId, role: "superadmin" }, a.id);
    const [publishLog] = await prisma.auditLog.findMany({
      where: { entityId: a.id, action: "publish" },
    });
    const publishDiff = publishLog.diff as AuditDiff;
    expect(publishDiff.approvalStatus).toEqual({ old: "pending_approval", new: "published" });
    expect(publishDiff.approvedBy).toEqual({ old: null, new: superadminId });

    const b = await services.create(
      { id: editorId, role: "editor" },
      { name: "Fence Cleaning", slug: "fence-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.reject({ id: superadminId, role: "superadmin" }, b.id, "Needs photos");
    const [rejectLog] = await prisma.auditLog.findMany({
      where: { entityId: b.id, action: "reject" },
    });
    const rejectDiff = rejectLog.diff as AuditDiff;
    expect(rejectDiff.approvalStatus).toEqual({ old: "pending_approval", new: "rejected" });
    expect(rejectDiff.rejectionReason).toEqual({ old: null, new: "Needs photos" });
  });

  it("records the actor's ipAddress on the audit row when supplied", async () => {
    const record = await services.create(
      { id: editorId, role: "editor", ipAddress: "203.0.113.7" },
      { name: "Vent Cleaning", slug: "vent-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    const [log] = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(log.ipAddress).toBe("203.0.113.7");
  });
});

// -------------------------------------------------------------------------
// REGRESSION GUARD for the partial unique index `Service_slug_live_key`.
//
// schema.prisma can only express `@@index([slug])` (NON-unique). The real
// uniqueness constraint lives in hand-written SQL in migration
// `20260823175559_partial_slug_index`. A future `prisma migrate dev` may
// propose dropping it as "drift"; accepting that would silently remove
// slug-uniqueness enforcement. If this test goes red, the partial index is
// gone from the database — re-add it before doing anything else.
// -------------------------------------------------------------------------
describe("Service partial unique slug index (migration-drift guard)", () => {
  it("rejects two live Services sharing a slug (partial unique index)", async () => {
    await prisma.service.create({
      data: {
        name: "Attic Cleaning",
        slug: "attic-cleaning",
        shortDescription: "s",
        fullDescription: "f",
      },
    });

    await expect(
      prisma.service.create({
        data: {
          name: "Attic Cleaning Duplicate",
          slug: "attic-cleaning",
          shortDescription: "s2",
          fullDescription: "f2",
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("still allows a soft-deleted row to share a slug with a live row", async () => {
    const first = await prisma.service.create({
      data: {
        name: "Shed Cleaning",
        slug: "shed-cleaning",
        shortDescription: "s",
        fullDescription: "f",
        deletedAt: new Date(),
      },
    });
    const second = await prisma.service.create({
      data: {
        name: "Shed Cleaning v2",
        slug: "shed-cleaning",
        shortDescription: "s2",
        fullDescription: "f2",
      },
    });
    expect(first.slug).toBe(second.slug);
  });
});

describe("ApprovableResourceService slug conflicts", () => {
  it("create() throws SlugConflictError when the slug is taken by a live record", async () => {
    await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Patio Cleaning", slug: "patio-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.create(
        { id: superadminId, role: "superadmin" },
        {
          name: "Patio Cleaning Copy",
          slug: "patio-cleaning",
          shortDescription: "s2",
          fullDescription: "f2",
        }
      )
    ).rejects.toThrow(SlugConflictError);
  });

  it("update() throws SlugConflictError when moving onto a taken slug", async () => {
    await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Grill Cleaning", slug: "grill-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    const other = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Deck Cleaning", slug: "deck-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.update({ id: superadminId, role: "superadmin" }, other.id, {
        slug: "grill-cleaning",
      })
    ).rejects.toThrow(SlugConflictError);
  });
});

describe("transactional audit-log guarantee", () => {
  it("rolls back the content write when the audit-log write fails", async () => {
    // AuditLog.adminId is a FK to Admin. A non-existent actor id makes the
    // audit insert fail *after* the content row was created inside the same
    // transaction — the content row must not survive.
    const ghostActorId = "ghost-admin-does-not-exist";

    await expect(
      services.create(
        { id: ghostActorId, role: "superadmin" },
        {
          name: "Phantom Cleaning",
          slug: "phantom-cleaning",
          shortDescription: "s",
          fullDescription: "f",
        }
      )
    ).rejects.toThrow();

    const orphans = await prisma.service.findMany({ where: { slug: "phantom-cleaning" } });
    expect(orphans).toHaveLength(0);

    const logs = await prisma.auditLog.findMany({ where: { adminId: ghostActorId } });
    expect(logs).toHaveLength(0);
  });

  it("rolls back an update() when the audit-log write fails", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Stone Cleaning", slug: "stone-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.update({ id: "ghost-admin-does-not-exist", role: "superadmin" }, record.id, {
        name: "Stone Cleaning HACKED",
      })
    ).rejects.toThrow();

    const after = await prisma.service.findUniqueOrThrow({ where: { id: record.id } });
    expect(after.name).toBe("Stone Cleaning");
  });
});

describe("stale approval metadata", () => {
  it("update() clears rejectionReason/approvedBy/approvedAt when re-entering the queue", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Duct Cleaning", slug: "duct-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    const rejected = await services.reject(
      { id: superadminId, role: "superadmin" },
      record.id,
      "Photo quality too low"
    );
    expect(rejected.rejectionReason).toBe("Photo quality too low");

    const updated = await services.update({ id: editorId, role: "editor" }, record.id, {
      name: "Duct Cleaning (revised)",
    });

    expect(updated.approvalStatus).toBe("pending_approval");
    expect(updated.rejectionReason).toBeNull();
    expect(updated.approvedBy).toBeNull();
    expect(updated.approvedAt).toBeNull();
  });

  it("clears a prior approval's approvedBy/approvedAt when an editor edits again", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Yard Cleaning", slug: "yard-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    const approved = await services.approve({ id: superadminId, role: "superadmin" }, record.id);
    expect(approved.approvedBy).toBe(superadminId);
    expect(approved.approvedAt).not.toBeNull();

    const updated = await services.update({ id: editorId, role: "editor" }, record.id, {
      name: "Yard Cleaning (revised)",
    });
    expect(updated.approvalStatus).toBe("pending_approval");
    expect(updated.approvedBy).toBeNull();
    expect(updated.approvedAt).toBeNull();
  });
});

describe("soft-deleted record guards", () => {
  it("refuses update() on a soft-deleted record", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Trash Cleaning", slug: "trash-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.softDelete({ id: superadminId, role: "superadmin" }, record.id);

    await expect(
      services.update({ id: editorId, role: "editor" }, record.id, { name: "Zombie edit" })
    ).rejects.toThrow(/soft-deleted/);

    const untouched = await prisma.service.findUniqueOrThrow({ where: { id: record.id } });
    expect(untouched.name).toBe("Trash Cleaning");
  });

  it("refuses approve() and reject() on a soft-deleted record", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Ghost Cleaning", slug: "ghost-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.softDelete({ id: superadminId, role: "superadmin" }, record.id);

    await expect(
      services.approve({ id: superadminId, role: "superadmin" }, record.id)
    ).rejects.toThrow(/soft-deleted/);

    await expect(
      services.reject({ id: superadminId, role: "superadmin" }, record.id, "nope")
    ).rejects.toThrow(/soft-deleted/);
  });
});

describe("ApprovableResourceService.softDelete / restore", () => {
  it("soft-deletes, then restores cleanly when no slug conflict exists", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Window Cleaning", slug: "window-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    const deleted = await services.softDelete({ id: superadminId, role: "superadmin" }, record.id);
    expect(deleted.deletedAt).not.toBeNull();

    const restored = await services.restore({ id: superadminId, role: "superadmin" }, record.id);
    expect(restored.deletedAt).toBeNull();
  });

  it("refuses to restore when another live record has taken the same slug", async () => {
    const original = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.softDelete({ id: superadminId, role: "superadmin" }, original.id);

    await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "New Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s2", fullDescription: "f2" }
    );

    await expect(
      services.restore({ id: superadminId, role: "superadmin" }, original.id)
    ).rejects.toThrow(SlugConflictError);
  });

  it("refuses softDelete()/restore() from a non-superadmin actor", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Balcony Cleaning", slug: "balcony-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.softDelete({ id: editorId, role: "editor" }, record.id)
    ).rejects.toThrow(/Only superadmin/);

    const deleted = await services.softDelete({ id: superadminId, role: "superadmin" }, record.id);
    expect(deleted.deletedAt).not.toBeNull();

    await expect(
      services.restore({ id: editorId, role: "editor" }, record.id)
    ).rejects.toThrow(/Only superadmin/);
  });
});

describe("ApprovableResourceService.approve / reject", () => {
  it("approve() publishes a pending record and writes a publish audit row", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Office Cleaning", slug: "office-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    expect(record.approvalStatus).toBe("pending_approval");

    const approved = await services.approve({ id: superadminId, role: "superadmin" }, record.id);
    expect(approved.approvalStatus).toBe("published");
    expect(approved.approvedBy).toBe(superadminId);

    const logs = await prisma.auditLog.findMany({
      where: { entityId: record.id, action: "publish" },
    });
    expect(logs).toHaveLength(1);
  });

  it("reject() requires a non-empty reason and records it", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Gutter Cleaning", slug: "gutter-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.reject({ id: superadminId, role: "superadmin" }, record.id, "")
    ).rejects.toThrow(/rejectionReason is required/);

    const rejected = await services.reject(
      { id: superadminId, role: "superadmin" },
      record.id,
      "Photo quality too low"
    );
    expect(rejected.approvalStatus).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Photo quality too low");
  });

  it("refuses approve()/reject() from a non-superadmin actor", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Roof Cleaning", slug: "roof-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.approve({ id: editorId, role: "editor" }, record.id)
    ).rejects.toThrow(/Only superadmin/);

    await expect(
      services.reject({ id: editorId, role: "editor" }, record.id, "no")
    ).rejects.toThrow(/Only superadmin/);
  });

  it("refuses to approve/reject a record that isn't pending_approval", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Driveway Cleaning", slug: "driveway-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    expect(record.approvalStatus).toBe("published");

    await expect(
      services.approve({ id: superadminId, role: "superadmin" }, record.id)
    ).rejects.toThrow(/not pending approval/);

    await expect(
      services.reject({ id: superadminId, role: "superadmin" }, record.id, "reason")
    ).rejects.toThrow(/not pending approval/);
  });
});

describe("publicVisibilityWhere", () => {
  it("is directly usable as a Prisma where fragment and hides trashed/pending/inactive rows", async () => {
    const live = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Visible Cleaning", slug: "visible-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    const pending = await services.create(
      { id: editorId, role: "editor" },
      { name: "Pending Cleaning", slug: "pending-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    const trashed = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Trashed Cleaning", slug: "trashed-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.softDelete({ id: superadminId, role: "superadmin" }, trashed.id);
    const inactive = await services.create(
      { id: superadminId, role: "superadmin" },
      {
        name: "Inactive Cleaning",
        slug: "inactive-cleaning",
        shortDescription: "s",
        fullDescription: "f",
        isActive: false,
      }
    );

    const visible = await prisma.service.findMany({ where: { ...publicVisibilityWhere } });
    const ids = visible.map((s) => s.id);

    expect(ids).toContain(live.id);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(trashed.id);
    expect(ids).not.toContain(inactive.id);
  });
});

describe("ApprovableResourceService with the instagramPost delegate", () => {
  it("saves an editor's create as pending_approval and writes one audit row", async () => {
    const record = await instagramPosts.create(
      { id: editorId, role: "editor" },
      { image: "https://example.test/a.jpg", permalink: "https://instagram.com/p/abc" }
    );

    expect(record.approvalStatus).toBe("pending_approval");

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("InstagramPost");
  });

  it("saves a superadmin's create as published directly", async () => {
    const record = await instagramPosts.create(
      { id: superadminId, role: "superadmin" },
      { image: "https://example.test/b.jpg", permalink: "https://instagram.com/p/def" }
    );

    expect(record.approvalStatus).toBe("published");
  });
});

describe("ApprovableResourceService.list", () => {
  it("returns every record with no filter", async () => {
    await faqs.create({ id: superadminId, role: "superadmin" }, { question: "Q1", answer: "A1" });
    await faqs.create({ id: superadminId, role: "superadmin" }, { question: "Q2", answer: "A2" });

    const all = await faqs.list();
    expect(all).toHaveLength(2);
  });

  it("filters by approvalStatus", async () => {
    await faqs.create({ id: editorId, role: "editor" }, { question: "Pending one", answer: "A" });
    await faqs.create({ id: superadminId, role: "superadmin" }, { question: "Published one", answer: "A" });

    const pending = await faqs.list({ status: "pending_approval" });
    expect(pending).toHaveLength(1);
    expect(pending[0].question).toBe("Pending one");
  });

  it("filters by free-text search on the type's searchable field, case-insensitive", async () => {
    await faqs.create({ id: superadminId, role: "superadmin" }, { question: "How do refunds work?", answer: "A" });
    await faqs.create({ id: superadminId, role: "superadmin" }, { question: "What are your hours?", answer: "A" });

    const found = await faqs.list({ search: "REFUNDS" });
    expect(found).toHaveLength(1);
    expect(found[0].question).toBe("How do refunds work?");
  });
});

describe("ApprovableResourceService.reorder", () => {
  it("updates order on every listed record and writes one audit row per record", async () => {
    const a = await faqs.create({ id: superadminId, role: "superadmin" }, { question: "A", answer: "A" });
    const b = await faqs.create({ id: superadminId, role: "superadmin" }, { question: "B", answer: "B" });

    await prisma.auditLog.deleteMany(); // clear the create-audit noise before asserting on reorder's rows

    const result = await faqs.reorder({ id: superadminId, role: "superadmin" }, [
      { id: a.id, order: 2 },
      { id: b.id, order: 1 },
    ]);

    expect(result.find((r) => r.id === a.id)?.order).toBe(2);
    expect(result.find((r) => r.id === b.id)?.order).toBe(1);

    const logs = await prisma.auditLog.findMany({ where: { entity: "Faq" } });
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.action === "update")).toBe(true);
  });

  it("is atomic: an unknown id in the batch rolls back every change in it", async () => {
    const a = await faqs.create({ id: superadminId, role: "superadmin" }, { question: "A", answer: "A" });

    await expect(
      faqs.reorder({ id: superadminId, role: "superadmin" }, [
        { id: a.id, order: 5 },
        { id: "does-not-exist", order: 1 },
      ])
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    const unchanged = await prisma.faq.findUniqueOrThrow({ where: { id: a.id } });
    expect(unchanged.order).toBe(0);
  });

  it("refuses to reorder a batch containing a soft-deleted record, and rolls the batch back", async () => {
    const live = await faqs.create({ id: superadminId, role: "superadmin" }, { question: "A", answer: "A" });
    const trashed = await faqs.create({ id: superadminId, role: "superadmin" }, { question: "B", answer: "B" });
    await faqs.softDelete({ id: superadminId, role: "superadmin" }, trashed.id);

    await expect(
      faqs.reorder({ id: superadminId, role: "superadmin" }, [
        { id: live.id, order: 5 },
        { id: trashed.id, order: 6 },
      ])
    ).rejects.toBeInstanceOf(InvalidStateError);

    await expect(
      faqs.reorder({ id: superadminId, role: "superadmin" }, [{ id: trashed.id, order: 6 }])
    ).rejects.toThrow(/soft-deleted/);

    const unchangedLive = await prisma.faq.findUniqueOrThrow({ where: { id: live.id } });
    expect(unchangedLive.order).toBe(0);
    const unchangedTrashed = await prisma.faq.findUniqueOrThrow({ where: { id: trashed.id } });
    expect(unchangedTrashed.order).toBe(0);
  });

  it("refuses to reorder a type with no order column (Testimonial)", async () => {
    const t = await prisma.testimonial.create({ data: { name: "Jane", rating: 5, message: "Great" } });
    await expect(
      testimonials.reorder({ id: superadminId, role: "superadmin" }, [{ id: t.id, order: 1 }])
    ).rejects.toBeInstanceOf(InvalidStateError);
  });
});
