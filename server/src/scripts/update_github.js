const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.systemSettings.upsert({
    where: { id: 'global-settings' },
    update: {
      githubUsername: 'Vidhushaaa30',
      autoPushOnCommit: true,
    },
    create: {
      id: 'global-settings',
      githubUsername: 'Vidhushaaa30',
      autoPushOnCommit: true,
    },
  });

  await prisma.commit.updateMany({
    where: { projectId: '4da9f642-6495-4290-bd2d-01cd9286a173' },
    data: {
      status: 'PUSHED',
      pushedToRemote: true,
      pushedDate: new Date(),
    },
  });

  console.log('Successfully updated settings and pushed status!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
