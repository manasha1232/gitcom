import { Request, Response } from 'express';
import { prisma } from '../prisma';
import https from 'https';

export const PRECONFIGURED_USERS = [
  {
    username: 'manasha1232',
    name: 'Manasha Pavithra J',
    token: process.env.MANASHA_GITHUB_TOKEN || '',
    avatarUrl: 'https://avatars.githubusercontent.com/u/209326007?v=4',
    email: '209326007+manasha1232@users.noreply.github.com',
  },
  {
    username: 'Vidhushaaa30',
    name: 'Vidhushanagarajan',
    token: '',
    avatarUrl: 'https://github.com/Vidhushaaa30.png',
    email: 'vidhushanagarajan30@gmail.com',
  },
];

async function fetchGitHubUser(token: string): Promise<{ login: string; name?: string; email?: string; avatar_url?: string } | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'User-Agent': 'CommitFlow-AI-Platform',
        Authorization: `token ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(body));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

// POST /api/auth/login-with-token
export async function loginWithToken(req: Request, res: Response) {
  try {
    const { token, username: inputUsername } = req.body;

    if (!token && !inputUsername) {
      return res.status(400).json({ success: false, error: 'GitHub Token or Username is required' });
    }

    let username = inputUsername;
    let name = inputUsername || 'Developer';
    let email: string | undefined = undefined;
    let avatarUrl: string | undefined = undefined;
    let actualToken = token || '';

    // If matching a pre-configured user
    const preconfigured = PRECONFIGURED_USERS.find(
      (u) =>
        (token && u.token === token) ||
        (inputUsername && u.username.toLowerCase() === inputUsername.toLowerCase())
    );

    if (preconfigured) {
      username = preconfigured.username;
      name = preconfigured.name;
      email = preconfigured.email;
      avatarUrl = preconfigured.avatarUrl;
      if (!actualToken && preconfigured.token) {
        actualToken = preconfigured.token;
      }
    } else if (token) {
      // Validate via GitHub API
      const ghUser = await fetchGitHubUser(token);
      if (ghUser) {
        username = ghUser.login;
        name = ghUser.name || ghUser.login;
        email = ghUser.email || `${ghUser.login}@users.noreply.github.com`;
        avatarUrl = ghUser.avatar_url;
      } else {
        username = username || `user_${Date.now().toString(36)}`;
        avatarUrl = `https://github.com/${username}.png`;
      }
    }

    if (!username) {
      return res.status(400).json({ success: false, error: 'Invalid GitHub Token' });
    }

    // Upsert User in database
    const user = await prisma.user.upsert({
      where: { githubUsername: username },
      create: {
        githubUsername: username,
        githubToken: actualToken,
        name,
        email,
        avatarUrl,
      },
      update: {
        githubToken: actualToken || undefined,
        name: name || undefined,
        avatarUrl: avatarUrl || undefined,
      },
    });

    // Ensure SystemSettings for user
    const settingId = `settings-${user.id}`;
    let userSettings = await prisma.systemSettings.findFirst({
      where: { userId: user.id },
    });

    if (!userSettings) {
      userSettings = await prisma.systemSettings.create({
        data: {
          id: settingId,
          userId: user.id,
          githubUsername: username,
          githubToken: actualToken,
          gitAuthorName: username,
          gitAuthorEmail: email || `${username}@users.noreply.github.com`,
        },
      });
    } else {
      userSettings = await prisma.systemSettings.update({
        where: { id: userSettings.id },
        data: {
          githubUsername: username,
          githubToken: actualToken || undefined,
          gitAuthorName: username,
          gitAuthorEmail: email || `${username}@users.noreply.github.com`,
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        githubUsername: user.githubUsername,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || `https://github.com/${user.githubUsername}.png`,
        githubToken: user.githubToken,
        settings: userSettings,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/auth/me
export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        githubUsername: user.githubUsername,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || `https://github.com/${user.githubUsername}.png`,
        githubToken: user.githubToken,
        settings: user.settings,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/auth/preconfigured-users
export async function getPreconfiguredUsers(_req: Request, res: Response) {
  res.json({
    success: true,
    data: PRECONFIGURED_USERS,
  });
}
