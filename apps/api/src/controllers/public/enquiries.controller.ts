import type { Request, Response } from "express";
import { z } from "zod";
import { PlaceService } from "../../lib/services/place.js";
import { prisma } from "../../db/prisma.js";

const places = new PlaceService(prisma);

const DEFAULT_SERVICE_NAME = "Walkthrough request";

/**
 * The single conversion-critical action on the public site: a visitor
 * submitting the "Book a walkthrough" form. Deliberately permissive on
 * shape (a real decision-maker filling this in on their phone should never
 * hit a wall) but strict on the two things that matter downstream: a
 * usable phone number, and a `place` that is a real, active service area
 * (the same list the form is populated from).
 */
const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((v) => v.replace(/\D/g, "").length >= 7, "phone number looks incomplete"),
  place: z.string().trim().min(1).max(200),
  preferredDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), "invalid date"),
  serviceId: z.string().trim().max(64).optional(),
  serviceName: z.string().trim().min(1).max(200).optional(),
});

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { name, phone, place, preferredDate, serviceId, serviceName } = parsed.data;

  const activePlaces = await places.listPublic();
  if (!activePlaces.some((p) => p.name === place)) {
    res.status(400).json({ error: "invalid_place" });
    return;
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      name,
      phone,
      place,
      serviceId: serviceId ?? null,
      serviceName: serviceName ?? DEFAULT_SERVICE_NAME,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent")?.slice(0, 500) ?? null,
    },
  });

  res.status(201).json({ id: enquiry.id, status: enquiry.status });
}
