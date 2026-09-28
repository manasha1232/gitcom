import app from './app';
import { prisma } from './prisma';
import { execSync } from 'child_process';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function main() {
  // Ensure database schema tables exist
  try {
    await prisma.systemSettings.upsert({
      where: { id: 'global-settings' },
      create: { id: 'global-settings' },
      update: {},
    });
  } catch (err: any) {
    console.log('[DB] SystemSettings table missing. Running schema db push...');
    try {
      execSync('npx prisma db push --accept-data-loss', {
        cwd: __dirname + '/..',
        stdio: 'inherit',
        env: process.env,
      });
      await prisma.systemSettings.upsert({
        where: { id: 'global-settings' },
        create: { id: 'global-settings' },
        update: {},
      });
      console.log('[DB] Schema tables synchronized successfully!');
    } catch (pushErr: any) {
      console.error('[DB] Schema sync warning:', pushErr.message);
    }
  }

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
