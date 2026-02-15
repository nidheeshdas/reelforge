import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const testUsers = [
    {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
      credits: 10,
    },
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'admin123',
      credits: 100,
      isCreator: true,
    },
    {
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'demo123',
      credits: 5,
    },
  ];

  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          credits: userData.credits,
          isCreator: userData.isCreator || false,
        },
      });
      console.log(`Created user: ${userData.email}`);
    } else {
      console.log(`User already exists: ${userData.email}`);
    }
  }

  console.log('Test users created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
