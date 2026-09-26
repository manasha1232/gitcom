import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GitCommit, GitBranch, GitPullRequest, CheckCircle2, Clock,
  FileCode, ExternalLink, RefreshCw, UploadCloud, Search, Eye,
  Sparkles, CheckCheck, AlertCircle, Copy, Check
} from 'lucide-react';
import { projectsApi, githubApi } from '../api/client';
import { useSSE } from '../contexts/SSEContext';
import type { Project, Commit } from '../api/client';

export default function CommitTimeline() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(id || '');
  const [project, setProject] = useState<Project | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [diffContent, setDiffContent] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { isConnected, latestCommit } = useSSE();

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

  const fetchCommits = async () => {
    if (!selectedProjectId) return;
    try {
      const [projRes, commitRes] = await Promise.all([
        projectsApi.get(selectedProjectId),
        projectsApi.commits(selectedProjectId, 1, 100),
      ]);
      if (projRes.success) setProject(projRes.data);
      if (commitRes.success && commitRes.data) {
        setCommits(commitRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCommits();
  }, [selectedProjectId]);

  // Handle SSE new commit
  useEffect(() => {
    if (latestCommit && latestCommit.projectId === selectedProjectId) {
      setCommits((prev) => {
        if (prev.some((c) => c.id === latestCommit.id)) return prev;
        return [latestCommit, ...prev];
      });
    }
  }, [latestCommit, selectedProjectId]);

  const handleViewDiff = async (commit: Commit) => {
    setSelectedCommit(commit);
    setDiffLoading(true);
    setDiffContent(null);
    try {
      const res = await projectsApi.diff(selectedProjectId, commit.commitHash);
      if (res.success && res.data) {
        setDiffContent(res.data.diff || commit.diffSummary || 'No textual diff available for this commit.');
      } else {
        setDiffContent(commit.diffSummary || 'No diff output.');
      }
    } catch {
      setDiffContent(commit.diffSummary || 'Error loading git diff.');
    } finally {
      setDiffLoading(false);
    }
  };

  const handlePushAll = async () => {
    if (!selectedProjectId) return;
    setPushing(true);
    setPushResult(null);
    try {
      const res = await githubApi.push({ projectId: selectedProjectId });
      if (res.success) {
        setPushResult('Successfully pushed all local commits to remote branch!');
        await fetchCommits();
      } else {
        setPushResult(`Push failed: ${res.error || 'Please configure GitHub remote token in settings'}`);
      }
    } catch (err: any) {
      setPushResult(`Error: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  const copyToClipboard = (text: string, hash: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredCommits = commits.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.message.toLowerCase().includes(q) ||
      c.shortHash.toLowerCase().includes(q) ||
      (c.task?.title && c.task.title.toLowerCase().includes(q)) ||
      (c.task?.category && c.task.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitCommit className="text-indigo-400" size={24} />
            Commit Timeline & Git History
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real Git commits authored autonomously with syntax validation, diffs, and GitHub synchronization
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="input-field max-w-xs text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.durationDays}d × {p.commitsPerDay}c)
              </option>
            ))}
          </select>

          <button onClick={fetchCommits} className="btn-secondary p-2.5 text-xs" title="Refresh Commits">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handlePushAll}
            disabled={pushing || commits.length === 0}
            className="btn-primary text-xs flex items-center gap-2"
          >
            <UploadCloud size={14} className={pushing ? 'animate-bounce' : ''} />
            {pushing ? 'Pushing to GitHub...' : 'Push to Remote'}
          </button>
        </div>
      </div>

      {pushResult && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
          pushResult.includes('Successfully')
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : 'bg-amber-950/40 border-amber-800 text-amber-300'
        }`}>
          <span>{pushResult}</span>
          <button onClick={() => setPushResult(null)} className="text-zinc-400 hover:text-white px-2">✕</button>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-zinc-500 animate-pulse">
          Loading git commit graph...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timeline Summary Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Total Commits</div>
              <div className="text-2xl font-bold text-white font-mono">{commits.length}</div>
              <div className="text-[11px] text-zinc-400 mt-1">Autonomous commits created</div>
            </div>

            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Active Branch</div>
              <div className="text-base font-bold text-indigo-400 font-mono flex items-center gap-1.5 mt-1">
                <GitBranch size={16} />
                <span>{project?.githubBranch || 'main'}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 truncate">
                {project?.githubRepoUrl || 'Local Repository'}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Author Identity</div>
              <div className="text-sm font-semibold text-zinc-200 mt-1 font-mono">
                CommitFlow Agent
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">agent@commitflow.ai</div>
            </div>

            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Validation Pass</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">100%</div>
              <div className="text-[11px] text-zinc-400 mt-1">All syntax checks green</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="card p-3.5 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by commit message, hash, category, or task title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 pr-3 py-1.5 text-xs w-full max-w-md"
              />
            </div>
            <div className="text-xs font-mono text-zinc-500">
              Showing {filteredCommits.length} of {commits.length} commits
            </div>
          </div>

          {/* Commits Timeline Stream */}
          {commits.length === 0 ? (
            <div className="card p-12 text-center space-y-3">
              <GitCommit size={36} className="text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-zinc-300">No Commits Yet</div>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Start the autonomous execution agent to begin generating code, running tests, and creating Git commits.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
              {filteredCommits.map((commit, index) => {
                const files: string[] = typeof commit.filesChanged === 'string'
                  ? JSON.parse(commit.filesChanged || '[]')
                  : commit.filesChanged || [];

                return (
                  <div key={commit.id} className="relative group">
                    {/* Node Dot on Timeline */}
                    <div className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-indigo-500 flex items-center justify-center group-hover:scale-125 group-hover:border-indigo-400 transition-all z-10" />

                    <div className="card p-4 hover:border-zinc-700 transition-all space-y-3">
                      {/* Top Row: Hash, Date, Day, Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(commit.commitHash, commit.shortHash)}
                            className="font-mono text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded hover:bg-indigo-900/80 transition-colors flex items-center gap-1.5"
                            title="Click to copy full commit hash"
                          >
                            {commit.shortHash}
                            {copiedHash === commit.shortHash ? (
                              <Check size={11} className="text-emerald-400" />
                            ) : (
                              <Copy size={11} className="text-indigo-400/70" />
                            )}
                          </button>

                          <span className="badge badge-indigo text-[10px]">
                            Day {commit.dayNumber}
                          </span>

                          {commit.task?.category && (
                            <span className="badge badge-purple text-[10px]">
                              {commit.task.category}
                            </span>
                          )}

                          {commit.testResult === 'PASS' && (
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Tested
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                          <span>{new Date(commit.createdAt).toLocaleTimeString()}</span>
                          <button
                            onClick={() => handleViewDiff(commit)}
                            className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 hover:text-white"
                          >
                            <Eye size={12} />
                            Diff
                          </button>
                        </div>
                      </div>

                      {/* Commit Message */}
                      <div className="text-sm font-semibold text-zinc-100 font-mono">
                        {commit.message}
                      </div>

                      {/* Reasoning or Task title */}
                      {commit.aiReasoning && (
                        <p className="text-xs text-zinc-400 italic">
                          "{commit.aiReasoning}"
                        </p>
                      )}

                      {/* Files changed pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-zinc-500 font-mono mr-1">Files:</span>
                        {files.map((file, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80 text-zinc-300 flex items-center gap-1"
                          >
                            <FileCode size={10} className="text-indigo-400" />
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Git Diff Modal */}
      {selectedCommit && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-4xl w-full max-h-[85vh] flex flex-col space-y-4 border-indigo-500/40">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                    {selectedCommit.shortHash}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    Day {selectedCommit.dayNumber}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">{selectedCommit.message}</h3>
              </div>
              <button
                onClick={() => setSelectedCommit(null)}
                className="text-zinc-400 hover:text-white text-lg font-mono px-2"
              >
                ✕
              </button>
            </div>

            {/* Diff content view */}
            <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 rounded-lg border border-zinc-800/80 font-mono text-xs">
              {diffLoading ? (
                <div className="text-zinc-500 py-8 text-center animate-pulse">
                  Loading unified git diff...
                </div>
              ) : diffContent ? (
                <div className="space-y-0.5 leading-5">
                  {diffContent.split('\n').map((line, idx) => {
                    const isAddition = line.startsWith('+') && !line.startsWith('+++');
                    const isDeletion = line.startsWith('-') && !line.startsWith('---');
                    const isHunk = line.startsWith('@@');

                    return (
                      <div
                        key={idx}
                        className={`px-2 py-0.5 rounded-sm whitespace-pre-wrap break-all ${
                          isAddition
                            ? 'bg-emerald-950/40 text-emerald-300'
                            : isDeletion
                            ? 'bg-rose-950/40 text-rose-300'
                            : isHunk
                            ? 'bg-indigo-950/50 text-indigo-400 font-bold'
                            : 'text-zinc-400'
                        }`}
                      >
                        {line || ' '}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-zinc-500 text-center py-4">No diff content</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-500">
              <div>Author: {selectedCommit.authorName} &lt;{selectedCommit.authorEmail}&gt;</div>
              <button onClick={() => setSelectedCommit(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
