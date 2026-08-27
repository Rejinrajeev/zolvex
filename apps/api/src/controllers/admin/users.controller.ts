import type { Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AdminUserService, ForbiddenAdminActionError, AdminNotFoundError } from "../../lib/services/admin-user.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const users = new AdminUserService(prisma);

function handleServiceError(error: unknown, res: Response): void {
  if (error instanceof ForbiddenAdminActionError) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (error instanceof AdminNotFoundError) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ error: "email_taken" });
    return;
  }
  // Anything else is unexpected: an async Express 4 handler's rejection isn't
  // auto-forwarded to the catch-all error middleware, so respond here rather
  // than rethrow into a promise nothing awaits.
  console.error(error);
  res.status(500).json({ error: "internal_error" });
}

export async function list(_req: AuthedRequest, res: Response) {
  res.status(200).json(await users.list());
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["editor", "superadmin"]),
});

export async function create(req: AuthedRequest, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const result = await users.create(req.actor!, parsed.data);
    res.status(201).json({
      id: result.admin.id,
      name: result.admin.name,
      email: result.admin.email,
      role: result.admin.role,
      tempPassword: result.tempPassword,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
}

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(["editor", "superadmin"]).optional(),
  })
  .refine((data) => data.isActive !== undefined || data.role !== undefined, {
    message: "at least one of isActive or role is required",
  });

export async function patch(req: AuthedRequest, res: Response) {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    let record;
    if (parsed.data.isActive !== undefined) {
      record = await users.setActive(req.actor!, req.params.id, parsed.data.isActive);
    }
    if (parsed.data.role !== undefined) {
      record = await users.changeRole(req.actor!, req.params.id, parsed.data.role);
    }
    res.status(200).json(record);
  } catch (error) {
    handleServiceError(error, res);
  }
}
