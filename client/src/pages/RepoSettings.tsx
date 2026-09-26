import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FolderGit2, GitBranch, Key, UploadCloud, RefreshCw,
  CheckCircle, AlertCircle, FileCode, HardDrive, Terminal,
  ExternalLink, Copy, Check
} from 'lucide-react';
import { projectsApi, githubApi } from '../api/client';
import type { Project, Repository } from '../api/client';

export default function RepoSettings() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(id || '');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    projectsApi.list().then((res) => {
      if (res.success && res.data) {
        setProjects(res.data);
        if (!selectedProjectId && res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      }
    });
  }, []);

  const fetchData = async () => {
    if (!selectedProjectId) return;
    try {
      const projRes = await projectsApi.get(selectedProjectId);
      if (projRes.success && projRes.data) {
        setProject(projRes.data);
        setRepoUrl(projRes.data.githubRepoUrl || '');
        setBranch(projRes.data.githubBranch || 'main');
      }

      const statusRes = await githubApi.status(selectedProjectId).catch(() => null);
      if (statusRes && statusRes.success) {
        setGitStatus(statusRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedProjectId]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await projectsApi.update(selectedProjectId, {
        githubRepoUrl: repoUrl,
        githubBranch: branch,
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Repository settings saved successfully!' });
        await fetchData();
      } else {
        setStatusMessage({ type: 'error', text: (res as any).error || 'Failed to update settings.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePush = async () => {
    if (!selectedProjectId) return;
    setPushing(true);
    setStatusMessage(null);
    try {
      let res = await githubApi.push({ projectId: selectedProjectId });
      if (!res.success && (res.error?.includes('fetch first') || res.error?.includes('non-fast-forward') || res.error?.includes('rejected') || res.error?.includes('diverged'))) {
        res = await githubApi.push({ projectId: selectedProjectId, force: true });
      }
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Successfully pushed all local commits to GitHub!' });
        await fetchData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to push to GitHub. Verify your GitHub Personal Access Token in Settings.',
        });
      }
    } catch (err: any) {
      if (err.message?.includes('fetch first') || err.message?.includes('non-fast-forward') || err.message?.includes('rejected') || err.message?.includes('diverged')) {
        try {
          const res = await githubApi.push({ projectId: selectedProjectId, force: true });
          if (res.success) {
            setStatusMessage({ type: 'success', text: 'Successfully pushed commits with updated author identity to GitHub!' });
            await fetchData();
            return;
          }
        } catch (retryErr: any) {
          setStatusMessage({ type: 'error', text: retryErr.message });
          return;
        }
      }
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setPushing(false);
    }
  };

  const copyLocalPath = () => {
    if (project?.localRepoPath) {
      navigator.clipboard.writeText(project.localRepoPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="text-indigo-400" size={24} />
            Repository Configuration
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Local git workspace, remote GitHub synchronization, branch targets, and credentials
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="input-field max-w-xs text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button onClick={fetchData} className="btn-secondary p-2.5 text-xs" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-zinc-500 animate-pulse">
          Loading repository configurations...
        </div>
      ) : !project ? (
        <div className="card p-12 text-center text-zinc-500">No project selected</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitBranch size={18} className="text-indigo-400" />
                  Remote Repository Setup
                </h3>
                <span className={`badge ${project.githubRepoUrl ? 'badge-emerald' : 'badge-zinc'}`}>
                  {project.githubRepoUrl ? 'Connected' : 'Local Only'}
                </span>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/my-project.git"
                    className="input-field text-sm font-mono w-full"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Enter your target repository URL. If empty, CommitFlow will operate locally.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                      Target Branch
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="input-field text-sm font-mono w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                      Author Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value="CommitFlow Agent <agent@commitflow.ai>"
                      className="input-field text-xs font-mono w-full opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={handlePush}
                    disabled={pushing || !project.githubRepoUrl}
                    className="btn-secondary text-xs flex items-center gap-2"
                  >
                    <UploadCloud size={14} className={pushing ? 'animate-bounce' : ''} />
                    {pushing ? 'Pushing...' : 'Push Commits to Remote'}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary text-xs flex items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>

            {/* Local Git Workspace Details */}
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-zinc-800">
                <HardDrive size={18} className="text-indigo-400" />
                Local Git Workspace Filesystem
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">
                    Filesystem Absolute Path
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={project.localRepoPath || 'Not initialized'}
                      className="input-field text-xs font-mono flex-1 opacity-80"
                    />
                    <button
                      onClick={copyLocalPath}
                      className="btn-secondary text-xs p-2.5"
                      title="Copy path"
                    >
                      {copiedPath ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Git Engine</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">simple-git v3.27</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Repository ID</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5 font-mono truncate">
                      {project.id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Status Box (1 col) */}
          <div className="space-y-6">
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Sync Status
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Remote URL:</span>
                  <span className="text-zinc-200 font-mono truncate max-w-[150px]">
                    {project.githubRepoUrl ? 'Configured' : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Branch:</span>
                  <span className="text-indigo-400 font-mono font-bold">
                    {project.githubBranch || 'main'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Commits Total:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {project.completedTasks}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Auto-Push:</span>
                  <span className="text-zinc-300 font-mono">Enabled</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-[11px] text-indigo-300 leading-relaxed">
                  💡 Tip: To authorize pushes to private GitHub repositories, enter your GitHub Personal Access Token with <code className="bg-indigo-950 px-1 py-0.5 rounded text-indigo-200">repo</code> scope in the main Settings page.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
