import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  githubToken: z.string().optional(),
  githubUsername: z.string().optional(),
  gitAuthorName: z.string().optional(),
  gitAuthorEmail: z.string().optional(),
  aiProvider: z.enum(['autonomous_builtin', 'gemini', 'openai', 'anthropic']).optional(),
  aiApiKey: z.string().optional(),
  aiModel: z.string().optional(),
  autoPushOnCommit: z.boolean().optional(),
  executionSpeedMs: z.number().int().min(500).max(30000).optional(),
});

// GET /api/settings
export async function getSettings(req: Request, res: Response) {
  try {
    const userId = (req.headers['x-user-id'] as string) || undefined;
    let settings = userId
      ? await prisma.systemSettings.findFirst({ where: { userId } })
      : await prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: userId ? `settings-${userId}` : 'global-settings', userId: userId || null },
      });
    }

    // Mask secrets
    const safe = {
      ...settings,
      gitAuthorName: settings.gitAuthorName || settings.githubUsername || 'manasha1232',
      gitAuthorEmail: settings.gitAuthorEmail || '209326007+manasha1232@users.noreply.github.com',
      githubToken: settings.githubToken ? `${settings.githubToken.slice(0, 8)}...` : null,
      aiApiKey: settings.aiApiKey ? `${settings.aiApiKey.slice(0, 8)}...` : null,
    };

    res.json({ success: true, data: safe });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/settings
export async function updateSettings(req: Request, res: Response) {
  try {
    const userId = (req.headers['x-user-id'] as string) || undefined;
    const body = settingsSchema.parse(req.body);

    const settingId = userId ? `settings-${userId}` : 'global-settings';

    const settings = await prisma.systemSettings.upsert({
      where: { id: settingId },
      create: { id: settingId, userId: userId || null, ...body },
      update: body,
    });

    res.json({ success: true, data: { message: 'Settings updated', id: settings.id } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/dashboard/stats
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const userId = (req.headers['x-user-id'] as string) || undefined;
    const projectWhere = userId ? { OR: [{ userId }, { userId: null }] } : undefined;

    const [totalProjects, activeProjects, completedProjects, totalCommits, totalLogs] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.project.count({ where: { ...projectWhere, status: 'RUNNING' } }),
      prisma.project.count({ where: { ...projectWhere, status: 'COMPLETED' } }),
      prisma.commit.count({ where: userId ? { project: projectWhere } : undefined }),
      prisma.executionLog.count({ where: userId ? { project: projectWhere } : undefined }),
    ]);

    const recentProjects = await prisma.project.findMany({
      where: projectWhere,
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, status: true, agentState: true,
        currentDay: true, durationDays: true, overallProgress: true,
        commitsPerDay: true, totalPlannedCommits: true,
        _count: { select: { commits: true } },
      },
    });

    res.json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalCommits,
        totalLogs,
        recentProjects,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
