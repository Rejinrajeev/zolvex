import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.pageContent.deleteMany();
  await prisma.place.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.service.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("Prisma schema round-trip", () => {
  it("creates and reads back one row of every model", async () => {
    const admin = await prisma.admin.create({
      data: {
        name: "Test Admin",
        email: "admin@zolvex.test",
        passwordHash: "hash",
        role: "superadmin",
      },
    });
    expect(admin.id).toBeTruthy();

    const session = await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        deviceInfo: "test-device",
        refreshTokenHash: "test-refresh-token-hash",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    expect(session.adminId).toBe(admin.id);

    const service = await prisma.service.create({
      data: {
        name: "Deep Cleaning",
        slug: "deep-cleaning",
        shortDescription: "Short",
        fullDescription: "Full",
        submittedBy: admin.id,
      },
    });
    expect(service.approvalStatus).toBe("draft");

    const blogPost = await prisma.blogPost.create({
      data: {
        title: "Post",
        image: "https://example.com/a.jpg",
        instagramUrl: "https://instagram.com/p/x",
        submittedBy: admin.id,
      },
    });
    expect(blogPost.id).toBeTruthy();

    const testimonial = await prisma.testimonial.create({
      data: { name: "Jane", rating: 5, message: "Great!", submittedBy: admin.id },
    });
    expect(testimonial.id).toBeTruthy();

    const faq = await prisma.faq.create({
      data: { question: "Q?", answer: "A.", submittedBy: admin.id },
    });
    expect(faq.id).toBeTruthy();

    const place = await prisma.place.create({ data: { name: "Downtown" } });
    expect(place.id).toBeTruthy();

    const pageContent = await prisma.pageContent.create({
      data: { pageKey: "landing_hero", data: { headline: "Welcome" } },
    });
    expect(pageContent.pageKey).toBe("landing_hero");

    const enquiry = await prisma.enquiry.create({
      data: {
        serviceId: service.id,
        serviceName: service.name,
        name: "Customer",
        phone: "555-0100",
        place: "Downtown",
      },
    });
    expect(enquiry.status).toBe("new");

    const auditLog = await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "create",
        entity: "Service",
        entityId: service.id,
        diff: { after: { name: service.name } },
      },
    });
    expect(auditLog.id).toBeTruthy();
  });
});
