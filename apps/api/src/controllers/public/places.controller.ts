import type { Request, Response } from "express";
import { PlaceService } from "../../lib/services/place.js";
import { prisma } from "../../db/prisma.js";

const places = new PlaceService(prisma);

export async function list(_req: Request, res: Response) {
  res.status(200).json(await places.listPublic());
}
