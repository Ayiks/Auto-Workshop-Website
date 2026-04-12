import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_FULL_NAME || 'System Administrator';

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env');
  }

  const existing = await prisma.superAdmin.findUnique({ where: { email } });

  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.superAdmin.create({
    data: { email, passwordHash, fullName },
  });

  console.log(`Super admin created successfully:`);
  console.log(`  ID:    ${superAdmin.id}`);
  console.log(`  Email: ${superAdmin.email}`);
  console.log(`  Name:  ${superAdmin.fullName}`);
}

main()
  .catch((err) => {
    console.error('Seed error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
