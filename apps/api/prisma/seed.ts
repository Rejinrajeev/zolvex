import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateTempPassword } from "../src/lib/auth/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const name = process.env.SEED_SUPERADMIN_NAME ?? "Superadmin";
  if (!email) {
    throw new Error("SEED_SUPERADMIN_EMAIL is required to seed the first superadmin");
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Superadmin ${email} already exists, skipping seed.`);
    return;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.admin.create({
    data: { name, email, passwordHash, role: "superadmin", mustChangePassword: true },
  });

  console.log(`Created superadmin ${email}`);
  console.log(`Temporary password (save this now, it will not be shown again): ${tempPassword}`);
  console.log("You'll be asked to set your own password right after your first sign-in.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
