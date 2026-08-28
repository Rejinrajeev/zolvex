-- AlterTable
ALTER TABLE "AdminSession" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshTokenHash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'draft',
    "submittedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramPost_approvalStatus_idx" ON "InstagramPost"("approvalStatus");

-- CreateIndex
CREATE INDEX "InstagramPost_deletedAt_idx" ON "InstagramPost"("deletedAt");

-- CreateIndex
CREATE INDEX "InstagramPost_approvalStatus_deletedAt_idx" ON "InstagramPost"("approvalStatus", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_refreshTokenHash_key" ON "AdminSession"("refreshTokenHash");
