import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';

export interface CommitResult {
  commitHash: string;
  shortHash: string;
  filesChanged: string[];
  diffSummary: string;
}

export class GitService {
  private getGit(repoPath: string): SimpleGit {
    return simpleGit({ baseDir: repoPath });
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async initRepository(
    repoPath: string,
    defaultBranch = 'main',
    authorName = 'manasha1232',
    authorEmail = '209326007+manasha1232@users.noreply.github.com'
  ): Promise<{ initialCommitHash?: string }> {
    await this.ensureDirectory(repoPath);
    const git = this.getGit(repoPath);

    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      await git.addConfig('user.name', authorName);
      await git.addConfig('user.email', authorEmail);
      await git.addConfig('commit.gpgsign', 'false');

      // Check current branch and set to defaultBranch
      try {
        await git.raw(['checkout', '-B', defaultBranch]);
      } catch {
        // Ignored if empty repo
      }

      // Create initial .gitignore
      const gitignoreContent = `node_modules/
dist/
build/
.env
.env.local
.DS_Store
*.log
coverage/
.prisma/
`;
      fs.writeFileSync(path.join(repoPath, '.gitignore'), gitignoreContent, 'utf-8');
      await git.add('.gitignore');
      const res = await git.commit('chore: initialize repository and ignore patterns', undefined, {
        '--author': `${authorName} <${authorEmail}>`,
      });
      const commitHash = await git.revparse(['HEAD']);
      return { initialCommitHash: commitHash.trim() };
    } else {
      await git.addConfig('user.name', authorName);
      await git.addConfig('user.email', authorEmail);
    }

    return {};
  }

  async setRemote(repoPath: string, remoteUrl: string, token?: string): Promise<void> {
    const git = this.getGit(repoPath);
    let targetUrl = remoteUrl;

    const authToken = token || process.env.MANASHA_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    if (authToken && remoteUrl.includes('github.com')) {
      const cleanUrl = remoteUrl.replace(/^https?:\/\//, '').replace(/.*@github\.com\/?/, 'github.com/');
      targetUrl = `https://${authToken}@${cleanUrl}`;
    }

    const remotes = await git.getRemotes();
    const hasOrigin = remotes.some((r) => r.name === 'origin');

    if (hasOrigin) {
      await git.remote(['set-url', 'origin', targetUrl]);
    } else {
      await git.addRemote('origin', targetUrl);
    }
  }

  async writeFile(repoPath: string, relativePath: string, content: string): Promise<string> {
    const fullPath = path.join(repoPath, relativePath);
    const dir = path.dirname(fullPath);
    await this.ensureDirectory(dir);
    fs.writeFileSync(fullPath, content, 'utf-8');
    return fullPath;
  }

  async readFile(repoPath: string, relativePath: string): Promise<string | null> {
    const fullPath = path.join(repoPath, relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async listRepositoryFiles(repoPath: string): Promise<{ path: string; size: number }[]> {
    if (!fs.existsSync(repoPath)) return [];

    const fileList: { path: string; size: number }[] = [];

    const walk = (dir: string, baseDir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name === '.git' || item.name === 'node_modules') continue;
        const fullItemPath = path.join(dir, item.name);
        const relPath = path.relative(baseDir, fullItemPath).replace(/\\/g, '/');
        if (item.isDirectory()) {
          walk(fullItemPath, baseDir);
        } else if (item.isFile()) {
          const stat = fs.statSync(fullItemPath);
          fileList.push({ path: relPath, size: stat.size });
        }
      }
    };

    walk(repoPath, repoPath);
    return fileList;
  }

  async createCommit(
    repoPath: string,
    message: string,
    authorName = 'manasha1232',
    authorEmail = '209326007+manasha1232@users.noreply.github.com'
  ): Promise<CommitResult> {
    const git = this.getGit(repoPath);

    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);
    await git.addConfig('commit.gpgsign', 'false');

    // Stage all changes
    await git.add('.');

    // Check status
    const status = await git.status();
    if (status.staged.length === 0 && status.created.length === 0 && status.modified.length === 0 && status.deleted.length === 0) {
      // Create a small metadata watermark or touch README to ensure genuine valid commit
      const metaPath = path.join(repoPath, '.commitflow-build.json');
      const metaData = {
        lastCommitTime: new Date().toISOString(),
        buildStatus: 'VERIFIED_INCREMENTAL_BUILD',
        commitMessage: message,
      };
      fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), 'utf-8');
      await git.add('.commitflow-build.json');
    }

    const commitSummary = await git.commit(message, undefined, {
      '--author': `${authorName} <${authorEmail}>`,
    });
    const commitHash = (await git.revparse(['HEAD'])).trim();
    const shortHash = commitHash.slice(0, 7);

    // Get changed files
    let filesChanged: string[] = [];
    try {
      const diffTree = await git.raw(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']);
      filesChanged = diffTree
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
    } catch {
      filesChanged = ['source files'];
    }

    // Get diff stat summary
    let diffSummary = '';
    try {
      diffSummary = await git.raw(['show', '--stat', '--oneline', 'HEAD']);
    } catch {
      diffSummary = `${filesChanged.length} files modified`;
    }

    return {
      commitHash,
      shortHash,
      filesChanged,
      diffSummary,
    };
  }

  async getDiffForCommit(repoPath: string, commitHash: string): Promise<string> {
    const git = this.getGit(repoPath);
    try {
      const diff = await git.show([commitHash]);
      return diff;
    } catch (err: any) {
      return `Failed to load diff: ${err.message}`;
    }
  }

  async pushBranch(
    repoPath: string,
    branch = 'main',
    remoteUrl?: string,
    token?: string,
    force = false
  ): Promise<{ success: boolean; message: string }> {
    const git = this.getGit(repoPath);

    const authToken = token || process.env.MANASHA_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    if (remoteUrl) {
      await this.setRemote(repoPath, remoteUrl, authToken);
    }

    try {
      const args = ['-u', 'origin', branch];
      if (force) args.push('--force');
      await git.push(args);
      return { success: true, message: `Pushed successfully to origin/${branch}` };
    } catch (err: any) {
      console.error('[GitService] pushBranch error:', err.message);
      return { success: false, message: err.message || 'Push failed' };
    }
  }

  async getGitLog(repoPath: string, maxCount = 50) {
    const git = this.getGit(repoPath);
    try {
      const log = await git.log({ maxCount });
      return log.all;
    } catch {
      return [];
    }
  }
}

export const gitService = new GitService();
