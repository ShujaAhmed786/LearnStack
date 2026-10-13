import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

export async function seedAdminUser() {
  console.log('Seeding admin user...');

  // 1. Find or create Organization "LearnStack"
  let org = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: 'LearnStack' },
        { slug: 'learnstack' },
      ],
    },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'LearnStack',
        slug: 'learnstack',
        primaryColor: '#14B8A6',
      },
    });
    console.log(`Created organization: ${org.name} (${org.id})`);
  } else {
    console.log(`Found organization: ${org.name} (${org.id})`);
  }

  // 2. Hash password with argon2id
  const email = 'shujaahmed198@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) {
  throw new Error('SEED_ADMIN_PASSWORD env var is required for seeding admin');
};
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  // 3. Upsert user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      active: true,
      orgId: org.id,
      name: 'Shuja Ahmed',
    },
    create: {
      email,
      passwordHash,
      name: 'Shuja Ahmed',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      active: true,
      orgId: org.id,
    },
  });

  console.log(`Successfully configured admin user: ${user.email} with role: ${user.role} in org: ${org.name}`);
  return user;
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed-admin.ts')) {
  seedAdminUser()
    .catch((e) => {
      console.error('Error seeding admin user:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
