import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { aiPlannerService } from '../services/aiPlanner';
import { schedulerService } from '../services/scheduler';
import { agentEngine } from '../services/agentEngine';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(20).max(5000),
  durationDays: z.number().int().min(1).max(365).default(20),
  commitsPerDay: z.number().int().min(1).max(50).default(15),
  githubRepoUrl: z.string().url().optional().or(z.literal('')),
  githubBranch: z.string().min(1).max(100).default('main'),
});

// POST /api/projects
export async function createProject(req: Request, res: Response) {
  try {
    const userId = (req.headers['x-user-id'] as string) || undefined;
    const body = createProjectSchema.parse(req.body);
    const totalPlannedCommits = body.durationDays * body.commitsPerDay;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        durationDays: body.durationDays,
        commitsPerDay: body.commitsPerDay,
        totalPlannedCommits,
        githubRepoUrl: body.githubRepoUrl || null,
        githubBranch: body.githubBranch,
        userId: userId || null,
        status: 'IDLE',
      },
    });

    // Pre-warm the repo directory
    await agentEngine.ensureProjectRepo(project.id, body.githubBranch);

    res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/projects
export async function listProjects(req: Request, res: Response) {
  try {
    const userId = (req.headers['x-user-id'] as string) || undefined;
    const projects = await prisma.project.findMany({
      where: userId ? { OR: [{ userId }, { userId: null }] } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { commits: true } },
        repository: { select: { isConnected: true, repoUrl: true } },
      },
    });
    res.json({ success: true, data: projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/projects/:id
export async function getProject(req: Request, res: Response) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        repository: true,
        _count: { select: { commits: true, logs: true } },
        plan: {
          include: {
            days: {
              include: {
                tasks: {
                  orderBy: { order: 'asc' },
                  include: { commit: true },
                },
              },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/projects/:id
export async function deleteProject(req: Request, res: Response) {
  try {
    await schedulerService.stopProject(req.params.id);
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/projects/:id/generate-plan
export async function generatePlan(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    await prisma.project.update({ where: { id }, data: { status: 'ANALYZING' } });

    const masterPlan = await aiPlannerService.generateMasterPlan(
      project.name,
      project.description,
      project.durationDays,
      project.commitsPerDay
    );

    // Delete old plan if exists
    await prisma.developmentPlan.deleteMany({ where: { projectId: id } });

    // Store plan
    const plan = await prisma.developmentPlan.create({
      data: {
        projectId: id,
        summary: masterPlan.summary,
        applicationType: masterPlan.applicationType,
        frontendStack: masterPlan.frontendStack,
        backendStack: masterPlan.backendStack,
        databaseStack: masterPlan.databaseStack,
        authStrategy: masterPlan.authStrategy,
        apiStructure: masterPlan.apiStructure,
        aiFeatures: masterPlan.aiFeatures,
        testingStrategy: masterPlan.testingStrategy || '',
        deploymentConfig: masterPlan.deploymentConfig || '',
        architectureNotes: masterPlan.architectureNotes,
        days: {
          create: masterPlan.days.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            focusArea: day.focusArea,
            tasks: {
              create: day.tasks.map((task) => ({
                taskNumber: task.taskNumber,
                title: task.title,
                description: task.description,
                category: task.category,
                order: task.taskNumber,
                prerequisites: JSON.stringify(task.prerequisites),
                targetFiles: JSON.stringify(task.targetFiles),
                expectedChanges: task.expectedChanges,
                reasoning: task.reasoning,
              })),
            },
          })),
        },
      },
    });

    const totalTasks = masterPlan.days.reduce((s, d) => s + d.tasks.length, 0);
    await prisma.project.update({
      where: { id },
      data: {
        status: 'PLAN_READY',
        totalTasks,
        agentState: 'IDLE',
      },
    });

    res.json({ success: true, data: { planId: plan.id, totalTasks, message: 'Development plan generated' } });
  } catch (err: any) {
    await prisma.project.update({ where: { id }, data: { status: 'IDLE' } }).catch(() => {});
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/projects/:id/plan
export async function getPlan(req: Request, res: Response) {
  try {
    const plan = await prisma.developmentPlan.findUnique({
      where: { projectId: req.params.id },
      include: {
        days: {
          include: {
            tasks: { orderBy: { order: 'asc' }, include: { commit: true } },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });
    if (!plan) return res.status(404).json({ success: false, error: 'No plan found' });
    res.json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/projects/:id/start
export async function startProject(req: Request, res: Response) {
  const result = await schedulerService.startProject(req.params.id);
  res.json(result);
}

// POST /api/projects/:id/pause
export async function pauseProject(req: Request, res: Response) {
  const result = await schedulerService.pauseProject(req.params.id);
  res.json(result);
}

// POST /api/projects/:id/resume
export async function resumeProject(req: Request, res: Response) {
  const result = await schedulerService.resumeProject(req.params.id);
  res.json(result);
}

// POST /api/projects/:id/stop
export async function stopProject(req: Request, res: Response) {
  const result = await schedulerService.stopProject(req.params.id);
  res.json(result);
}

// POST /api/projects/:id/run-next
export async function runNextTask(req: Request, res: Response) {
  const result = await schedulerService.runNextTask(req.params.id);
  res.json(result);
}

// GET /api/projects/:id/progress
export async function getProgress(req: Request, res: Response) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        status: true,
        agentState: true,
        currentDay: true,
        durationDays: true,
        currentTaskIndex: true,
        totalTasks: true,
        completedTasks: true,
        failedTasks: true,
        overallProgress: true,
        testsPassingPct: true,
        totalPlannedCommits: true,
        currentTaskTitle: true,
        commitsPerDay: true,
        _count: { select: { commits: true } },
      },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/projects/:id/commits
export async function getCommits(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [commits, total] = await Promise.all([
      prisma.commit.findMany({
        where: { projectId: req.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          task: { select: { title: true, category: true, description: true } },
        },
      }),
      prisma.commit.count({ where: { projectId: req.params.id } }),
    ]);

    res.json({
      success: true,
      data: commits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/projects/:id/logs
export async function getLogs(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 200;
    const logs = await prisma.executionLog.findMany({
      where: { projectId: req.params.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    res.json({ success: true, data: logs.reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/projects/:id/diff/:commitHash
export async function getCommitDiff(req: Request, res: Response) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { localRepoPath: true },
    });
    if (!project?.localRepoPath) return res.status(404).json({ success: false, error: 'Repo not initialized' });

    const { gitService } = await import('../services/gitService');
    const diff = await gitService.getDiffForCommit(project.localRepoPath, req.params.commitHash);
    res.json({ success: true, data: { diff } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/projects/import-github
export async function importProjectFromGitHub(req: Request, res: Response) {
  try {
    const userId = (req.headers['x-user-id'] as string) || undefined;
    const { githubRepoUrl, name: customName, description: customDesc } = req.body;

    if (!githubRepoUrl) {
      return res.status(400).json({ success: false, error: 'githubRepoUrl is required' });
    }

    const cleanUrl = githubRepoUrl.replace(/\.git$/, '').replace(/\/$/, '');
    const parts = cleanUrl.split('/');
    const repo = parts.pop();
    const owner = parts.pop();

    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: 'Invalid GitHub repository URL' });
    }

    // Get user token if available
    let token: string | undefined = undefined;
    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      token = u?.githubToken || undefined;
    }

    const https = require('https');
    const fetchCommits = (): Promise<any[]> =>
      new Promise((resolve) => {
        const headers: any = { 'User-Agent': 'CommitFlow-AI-Platform' };
        if (token) headers['Authorization'] = `token ${token}`;

        const req = https.request(
          {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/commits?per_page=100`,
            method: 'GET',
            headers,
          },
          (res: any) => {
            let body = '';
            res.on('data', (c: any) => (body += c));
            res.on('end', () => {
              try {
                if (res.statusCode === 200) {
                  resolve(JSON.parse(body));
                } else {
                  resolve([]);
                }
              } catch {
                resolve([]);
              }
            });
          }
        );
        req.on('error', () => resolve([]));
        req.end();
      });

    const commits = await fetchCommits();
    const completedTasks = commits.length;
    const durationDays = 20;
    const commitsPerDay = 17;
    const totalPlannedCommits = durationDays * commitsPerDay;
    const totalTasks = totalPlannedCommits;
    const overallProgress = totalTasks > 0 ? Math.min(100, (completedTasks / totalTasks) * 100) : 0;
    const currentDay = Math.min(durationDays, Math.ceil(completedTasks / commitsPerDay) || 1);

    const projectName = customName || repo.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const projectDesc = customDesc || `Imported project from https://github.com/${owner}/${repo} (${completedTasks} commits sync'd).`;

    const project = await prisma.project.create({
      data: {
        name: projectName,
        description: projectDesc,
        durationDays,
        commitsPerDay,
        totalPlannedCommits,
        totalTasks,
        completedTasks,
        currentDay,
        overallProgress: parseFloat(overallProgress.toFixed(1)),
        githubRepoUrl: cleanUrl,
        githubBranch: 'main',
        status: completedTasks >= totalTasks ? 'COMPLETED' : 'RUNNING',
        userId: userId || null,
      },
    });

    await agentEngine.ensureProjectRepo(project.id, 'main');

    // Recreate commits in database
    if (commits.length > 0) {
      for (let i = 0; i < commits.length; i++) {
        const c = commits[commits.length - 1 - i]; // chronologically
        const sha = c.sha || `hash_${i}`;
        const msg = c.commit?.message?.split('\n')[0] || 'Commit';
        const authorName = c.commit?.author?.name || owner;
        const authorEmail = c.commit?.author?.email || `${owner}@users.noreply.github.com`;

        await prisma.commit.create({
          data: {
            projectId: project.id,
            dayNumber: Math.ceil((i + 1) / commitsPerDay),
            commitNumber: i + 1,
            commitHash: sha,
            shortHash: sha.substring(0, 7),
            message: msg,
            authorName,
            authorEmail,
            filesCount: 1,
            status: 'PUSHED',
            pushedToRemote: true,
            pushedDate: new Date(c.commit?.author?.date || Date.now()),
          },
        });
      }
    }

    res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
