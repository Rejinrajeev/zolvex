import type { PrismaClient } from "@prisma/client";

const TRASHABLE_DELEGATES = ["service", "blogPost", "testimonial", "faq", "instagramPost", "place"] as const;
const ENTITY_NAMES: Record<(typeof TRASHABLE_DELEGATES)[number], string> = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
  instagramPost: "InstagramPost",
  place: "Place",
};

export async function listTrash(prisma: PrismaClient) {
  const perType = await Promise.all(
    TRASHABLE_DELEGATES.map(async (delegateName) => {
      const records = await (prisma as any)[delegateName].findMany({ where: { deletedAt: { not: null } } });
      return records.map((record: { id: string }) => ({ entity: ENTITY_NAMES[delegateName], ...record }));
    })
  );
  return perType.flat();
}
