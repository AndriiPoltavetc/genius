import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.warn('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice',
      passwordHash,
      rating: 1400,
      gamesPlayed: 20,
      gamesWon: 12,
      gamesLost: 6,
      gamesDrawn: 2,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob',
      passwordHash,
      rating: 1250,
      gamesPlayed: 15,
      gamesWon: 7,
      gamesLost: 7,
      gamesDrawn: 1,
    },
  });

  console.warn(`Created users: alice (${alice.id}), bob (${bob.id})`);
  console.warn('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
