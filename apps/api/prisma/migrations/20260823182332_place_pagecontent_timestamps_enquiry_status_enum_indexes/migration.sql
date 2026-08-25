-- NOTE: the partial unique index "Service_slug_live_key" (created by hand in
-- migration 20260823175559_partial_slug_index) is deliberately NOT touched here.
-- Prisma cannot express partial indexes in schema.prisma; if a future
-- `prisma migrate dev` ever proposes dropping it, that DROP must be removed by
-- hand. See the MIGRATION HAZARD note above `Service.slug` in schema.prisma.

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('new', 'pushed_to_crm', 'failed', 'needs_manual_push');

-- AlterTable
-- Prisma's generated diff wanted to DROP + re-ADD Enquiry.status (data loss).
-- Replaced with an in-place cast so existing rows survive; any stored value
-- outside the enum fails loudly instead of being silently discarded.
-- The status index is dropped first because ALTER COLUMN ... TYPE would otherwise
-- keep it and the CreateIndex below would collide.
DROP INDEX "Enquiry_status_idx";
ALTER TABLE "Enquiry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Enquiry" ALTER COLUMN "status" TYPE "EnquiryStatus" USING "status"::"EnquiryStatus";
ALTER TABLE "Enquiry" ALTER COLUMN "status" SET DEFAULT 'new';

-- AlterTable
ALTER TABLE "PageContent" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "BlogPost_approvalStatus_deletedAt_idx" ON "BlogPost"("approvalStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "Enquiry_status_idx" ON "Enquiry"("status");

-- CreateIndex
CREATE INDEX "Faq_approvalStatus_deletedAt_idx" ON "Faq"("approvalStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "Service_approvalStatus_deletedAt_idx" ON "Service"("approvalStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "Testimonial_approvalStatus_deletedAt_idx" ON "Testimonial"("approvalStatus", "deletedAt");
