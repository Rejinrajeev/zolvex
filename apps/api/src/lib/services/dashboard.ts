import type { PrismaClient } from "@prisma/client";

const APPROVABLE_DELEGATES = ["service", "blogPost", "testimonial", "faq", "instagramPost"] as const;
const ENTITY_NAMES: Record<(typeof APPROVABLE_DELEGATES)[number], string> = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
  instagramPost: "InstagramPost",
};

/**
 * One UNION-ALL-shaped list across all five approvable types' pending-approval
 * queue, sorted newest-submission-first. Read-only — no service call needed,
 * see the Global Constraints note on reads.
 */
export async function listPendingApprovals(prisma: PrismaClient) {
  const perType = await Promise.all(
    APPROVABLE_DELEGATES.map(async (delegateName) => {
      const records = await (prisma as any)[delegateName].findMany({
        where: { approvalStatus: "pending_approval", deletedAt: null },
      });
      return records.map((record: { id: string; createdAt: Date }) => ({
        entity: ENTITY_NAMES[delegateName],
        ...record,
      }));
    })
  );
  return perType.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
