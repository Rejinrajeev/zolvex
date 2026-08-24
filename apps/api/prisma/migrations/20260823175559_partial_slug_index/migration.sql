-- DropIndex
DROP INDEX "Service_slug_key";

-- CreateIndex
CREATE INDEX "Service_slug_idx" ON "Service"("slug");

-- CreateIndex
-- Partial unique index: uniqueness is enforced only among live (non-soft-deleted)
-- rows, so a soft-deleted record no longer blocks a new/restored record from
-- reusing its slug. Prisma's schema DSL cannot express partial indexes, so this
-- is hand-written; `prisma migrate diff` will show this as drift against
-- schema.prisma, which is expected and accepted for this constraint.
CREATE UNIQUE INDEX "Service_slug_live_key" ON "Service"("slug") WHERE "deletedAt" IS NULL;
