import app from './app';
import { prisma } from './prisma';
import { schedulerService } from './services/scheduler';
import { execSync } from 'child_process';
import { PRECONFIGURED_USERS } from './controllers/auth.controller';
import { getFallbackGitHubToken } from './services/gitService';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function main() {
  // Ensure database schema tables exist
  const defaultToken = getFallbackGitHubToken();
  try {
    await prisma.systemSettings.upsert({
      where: { id: 'global-settings' },
      create: {
        id: 'global-settings',
        githubToken: defaultToken,
        githubUsername: 'manasha1232',
        gitAuthorName: 'manasha1232',
        gitAuthorEmail: '209326007+manasha1232@users.noreply.github.com',
        autoPushOnCommit: true,
      },
      update: {
        githubToken: defaultToken,
        githubUsername: 'manasha1232',
        gitAuthorName: 'manasha1232',
        gitAuthorEmail: '209326007+manasha1232@users.noreply.github.com',
        autoPushOnCommit: true,
      },
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
        create: {
          id: 'global-settings',
          githubToken: defaultToken,
          githubUsername: 'manasha1232',
          gitAuthorName: 'manasha1232',
          gitAuthorEmail: '209326007+manasha1232@users.noreply.github.com',
          autoPushOnCommit: true,
        },
        update: {
          githubToken: defaultToken,
          githubUsername: 'manasha1232',
          gitAuthorName: 'manasha1232',
          gitAuthorEmail: '209326007+manasha1232@users.noreply.github.com',
          autoPushOnCommit: true,
        },
      });
      console.log('[DB] Schema tables synchronized successfully!');
    } catch (pushErr: any) {
      console.error('[DB] Schema sync warning:', pushErr.message);
    }
  }

  // Seed default preconfigured users
  try {
    for (const u of PRECONFIGURED_USERS) {
      await prisma.user.upsert({
        where: { githubUsername: u.username },
        create: {
          githubUsername: u.username,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          githubToken: u.token,
        },
        update: {
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          githubToken: u.token || undefined,
        },
      });
    }
  } catch (e: any) {
    console.log('[DB] User seeding notice:', e.message);
  }

  // Auto-resume all in-progress projects on server boot
  try {
    const runningProjects = await prisma.project.findMany({
      where: { status: 'RUNNING' },
    });
    for (const p of runningProjects) {
      if (p.overallProgress < 100) {
        console.log(`[Scheduler] Auto-resuming in-progress project: "${p.name}" (${p.overallProgress}% complete)`);
        schedulerService.startProject(p.id).catch(() => {});
      }
    }
  } catch (e: any) {
    console.log('[Scheduler] Auto-resume check notice:', e.message);
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
