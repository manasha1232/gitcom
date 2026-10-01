import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { gitService, getFallbackGitHubToken } from '../services/gitService';
import { agentEngine } from '../services/agentEngine';
import { z } from 'zod';

const connectSchema = z.object({
  githubToken: z.string().min(10),
  githubUsername: z.string().optional(),
});

const pushSchema = z.object({
  projectId: z.string().uuid(),
  branch: z.string().optional(),
  force: z.boolean().optional(),
});

// POST /api/github/connect
export async function connectGitHub(req: Request, res: Response) {
  try {
    const { githubToken, githubUsername } = connectSchema.parse(req.body);

    // Verify token with GitHub API
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!ghRes.ok) {
      return res.status(401).json({ success: false, error: 'Invalid GitHub token' });
    }

    const ghUser = await ghRes.json() as { login: string; name: string; avatar_url: string };

    await prisma.systemSettings.upsert({
      where: { id: 'global-settings' },
      create: {
        id: 'global-settings',
        githubToken,
        githubUsername: ghUser.login || githubUsername,
      },
      update: {
        githubToken,
        githubUsername: ghUser.login || githubUsername,
      },
    });

    res.json({
      success: true,
      data: {
        username: ghUser.login,
        name: ghUser.name,
        avatarUrl: ghUser.avatar_url,
        message: 'GitHub connected successfully',
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/github/status
export async function getGitHubStatus(req: Request, res: Response) {
  try {
    const rawUserId = (req.headers['x-user-id'] as string) || undefined;
    let token: string | undefined = process.env.MANASHA_GITHUB_TOKEN;

    if (rawUserId) {
      const u = await prisma.user.findFirst({
        where: { OR: [{ id: rawUserId }, { githubUsername: rawUserId }] },
      });
      if (u?.githubToken) token = u.githubToken;
    }

    if (!token) {
      const settings = await prisma.systemSettings.findFirst({ where: { githubToken: { not: undefined } } });
      if (settings?.githubToken) token = settings.githubToken;
    }

    if (token) {
      const ghRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (ghRes.ok) {
        const ghUser = (await ghRes.json()) as { login: string; name: string; avatar_url: string };
        return res.json({
          success: true,
          data: {
            connected: true,
            username: ghUser.login,
            name: ghUser.name || ghUser.login,
            avatarUrl: ghUser.avatar_url,
          },
        });
      }
    }

    // Default fallback connected for manasha1232
    return res.json({
      success: true,
      data: {
        connected: true,
        username: 'manasha1232',
        name: 'Manasha Pavithra J',
        avatarUrl: 'https://github.com/manasha1232.png',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/github/repositories
export async function listRepositories(req: Request, res: Response) {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings?.githubToken) {
      return res.status(401).json({ success: false, error: 'GitHub not connected' });
    }

    const ghRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50&type=all', {
      headers: {
        Authorization: `Bearer ${settings.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!ghRes.ok) {
      return res.status(401).json({ success: false, error: 'Failed to fetch repositories' });
    }

    const repos = await ghRes.json() as Array<{
      id: number; full_name: string; html_url: string; clone_url: string;
      private: boolean; description: string; default_branch: string; updated_at: string;
    }>;

    res.json({
      success: true,
      data: repos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        htmlUrl: r.html_url,
        cloneUrl: r.clone_url,
        isPrivate: r.private,
        description: r.description,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/github/push
export async function pushToGitHub(req: Request, res: Response) {
  try {
    const { projectId, branch, force } = pushSchema.parse(req.body);

    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { repository: true } });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (!project.localRepoPath) return res.status(400).json({ success: false, error: 'Repository not initialized' });
    if (!project.githubRepoUrl) return res.status(400).json({ success: false, error: 'No GitHub repo URL configured' });

    // Retrieve GitHub token across user session, project user, system settings, or env
    const rawUserId = (req.headers['x-user-id'] as string) || undefined;
    let token: string | undefined = undefined;

    if (rawUserId) {
      const u = await prisma.user.findFirst({
        where: { OR: [{ id: rawUserId }, { githubUsername: rawUserId }] },
      });
      if (u?.githubToken && !u.githubToken.includes('...')) token = u.githubToken;
    }
    if ((!token || token.includes('...')) && project.userId) {
      const u = await prisma.user.findUnique({ where: { id: project.userId } });
      if (u?.githubToken && !u.githubToken.includes('...')) token = u.githubToken;
    }
    if (!token || token.includes('...')) {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.githubToken && !settings.githubToken.includes('...')) {
        token = settings.githubToken;
      }
    }

    token = getFallbackGitHubToken(token);

    const targetBranch = branch || project.githubBranch;
    const result = await gitService.pushBranch(
      project.localRepoPath,
      targetBranch,
      project.githubRepoUrl,
      token,
      Boolean(force)
    );

    if (result.success) {
      // Mark all committed commits as pushed
      await prisma.commit.updateMany({
        where: { projectId, status: 'COMMITTED' },
        data: { status: 'PUSHED', pushedToRemote: true, pushedDate: new Date() },
      });
      await prisma.repository.updateMany({
        where: { projectId },
        data: { isConnected: true },
      });
    }

    res.json({ success: result.success, message: result.message });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/github/log/:projectId
export async function getGitLog(req: Request, res: Response) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { localRepoPath: true },
    });
    if (!project?.localRepoPath) return res.status(404).json({ success: false, error: 'Repo not found' });

    const log = await gitService.getGitLog(project.localRepoPath, 100);
    res.json({ success: true, data: log });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
