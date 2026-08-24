// Defensive: the singleton reads DATABASE_URL at construction time. Loading
// dotenv here (rather than relying on server.ts importing it first) means any
// consumer — a test, a script, a worker — gets a correctly configured client
// regardless of import order.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
