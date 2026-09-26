import app from './app';
import { prisma } from './prisma';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function main() {
  // Ensure default settings exist
  await prisma.systemSettings.upsert({
    where: { id: 'global-settings' },
    create: { id: 'global-settings' },
    update: {},
  });

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 CommitFlow AI Server`);
    console.log(`   Server:   http://localhost:${PORT}`);
    console.log(`   API:      http://localhost:${PORT}/api`);
    console.log(`   SSE:      http://localhost:${PORT}/events`);
    console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Graceful shutdown...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected. Bye!\n');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
