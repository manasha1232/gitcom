import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, githubApi } from '../api/client';
import type { ProjectDetail, Commit, ExecutionLog, Day } from '../api/client';
import { useSSE } from '../contexts/SSEContext';
import LogConsole from '../components/LogConsole';
import {
  ArrowLeft, Play, Pause, Square, SkipForward, RefreshCw,
  GitCommit, Calendar, CheckCircle2, AlertTriangle, Cpu,
  Zap, GitBranch, Terminal, List, Clock, Upload, Loader2, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';

type Tab = 'overview' | 'plan' | 'commits' | 'logs';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    RUNNING: 'badge-running',
    COMPLETED: 'badge-success',
    PAUSED: 'badge-warning',
    FAILED: 'badge-error',
    PLAN_READY: 'badge bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
    ANALYZING: 'badge-running',
    IDLE: 'badge-idle',
  };
  return <span className={map[status] || 'badge-idle'}>{status.replace('_', ' ')}</span>;
}

function AgentStateIndicator({ state, task }: { state: string; task?: string | null }) {
  const isActive = ['WORKING', 'TESTING', 'COMMITTING', 'PUSHING'].includes(state);
  if (!isActive && state !== 'ERROR') return null;

  const stateLabel: Record<string, string> = {
    WORKING: 'Generating code',
    TESTING: 'Running tests',
    COMMITTING: 'Creating commit',
    PUSHING: 'Pushing to GitHub',
    ERROR: 'Error encountered',
  };

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border',
      state === 'ERROR'
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
    )}>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
      <span>{stateLabel[state] || state}</span>
      {task && <span className="text-zinc-500">— {task}</span>}
    </div>
  );
}

function CommitItem({ commit }: { commit: Commit }) {
  const files: string[] = JSON.parse(commit.filesChanged || '[]');
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1e2a3d] last:border-0 group hover:bg-white/[0.02] px-1 rounded-lg">
      <div className={clsx('mt-0.5 p-1.5 rounded-md flex-shrink-0', commit.testResult === 'PASS' ? 'bg-emerald-500/15' : 'bg-rose-500/15')}>
        {commit.testResult === 'PASS' ? <CheckCircle2 size={12} className="text-emerald-400" /> : <AlertTriangle size={12} className="text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[11px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{commit.shortHash}</span>
          <span className="text-xs text-zinc-300 truncate">{commit.message}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
          <span>Day {commit.dayNumber}</span>
          <span>#{commit.commitNumber}</span>
          <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          <span className="font-mono">{new Date(commit.createdAt).toLocaleTimeString()}</span>
          {commit.pushedToRemote && <span className="text-emerald-500 flex items-center gap-1"><Upload size={9} />Pushed</span>}
        </div>
        {commit.task && (
          <div className="text-[10px] text-zinc-600 mt-0.5 font-mono truncate">↳ {commit.task.category}: {commit.task.title}</div>
        )}
      </div>
      <div className="flex-shrink-0">
        <span className={clsx('badge text-[10px]', commit.status === 'PUSHED' ? 'badge-success' : commit.status === 'COMMITTED' ? 'badge-running' : 'badge-idle')}>
          {commit.status}
        </span>
      </div>
    </div>
  );
}

function DayPlanView({ day }: { day: Day }) {
  const completed = day.tasks.filter((t) => t.status === 'COMPLETED').length;
  const failed = day.tasks.filter((t) => t.status === 'FAILED').length;
  const inProgress = day.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const total = day.tasks.length;

  const catColors: Record<string, string> = {
    DATABASE_MODEL: 'text-amber-400',
    BACKEND_API: 'text-cyan-400',
    FEATURE: 'text-indigo-400',
    COMPONENT: 'text-purple-400',
    UI: 'text-pink-400',
    AUTH: 'text-orange-400',
    AI_FEATURE: 'text-violet-400',
    TEST: 'text-emerald-400',
    DOCS: 'text-zinc-400',
    DEPLOYMENT: 'text-blue-400',
    CONFIG: 'text-zinc-400',
    ERROR_HANDLING: 'text-rose-400',
    PERFORMANCE: 'text-teal-400',
    REFACTOR: 'text-yellow-400',
    VALIDATION: 'text-lime-400',
    BUG_FIX: 'text-rose-400',
  };

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2a3d]">
        <div>
          <div className="text-sm font-semibold text-zinc-200">{day.title}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{day.focusArea}</div>
        </div>
        <div className="flex items-center gap-2">
          {completed === total ? (
            <span className="badge-success text-[10px]">✓ {completed}/{total}</span>
          ) : inProgress > 0 ? (
            <span className="badge-running text-[10px]">● {completed}/{total}</span>
          ) : (
            <span className="badge-idle text-[10px]">{completed}/{total}</span>
          )}
        </div>
      </div>
      <div className="divide-y divide-[#1a2235]">
        {day.tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
            <div className={clsx('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
              task.status === 'COMPLETED' ? 'bg-emerald-500/20' :
              task.status === 'FAILED' ? 'bg-rose-500/20' :
              task.status === 'IN_PROGRESS' ? 'bg-indigo-500/20' : 'bg-zinc-800'
            )}>
              {task.status === 'COMPLETED' && <CheckCircle2 size={10} className="text-emerald-400" />}
              {task.status === 'FAILED' && <AlertTriangle size={10} className="text-rose-400" />}
              {task.status === 'IN_PROGRESS' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
              {task.status === 'PENDING' && <div className="w-1 h-1 rounded-full bg-zinc-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-zinc-300 truncate block">{task.title}</span>
              {task.commit && (
                <span className="font-mono text-[10px] text-indigo-400">{task.commit.shortHash}</span>
              )}
            </div>
            <span className={clsx('text-[10px] font-mono flex-shrink-0', catColors[task.category] || 'text-zinc-500')}>
              {task.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subscribe, unsubscribe, logs: sseLogs, progress: sseProgress, connected } = useSSE();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const res = await projectsApi.get(id);
      setProject(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCommits = useCallback(async () => {
    if (!id) return;
    const res = await projectsApi.commits(id);
    setCommits(res.data);
  }, [id]);

  const fetchLogs = useCallback(async () => {
    if (!id) return;
    const res = await projectsApi.logs(id);
    setLogs(res.data);
  }, [id]);

  useEffect(() => {
    fetchProject();
    fetchCommits();
    fetchLogs();
    if (id) subscribe(id);
    return () => unsubscribe();
  }, [id]);

  // Refresh on SSE progress
  useEffect(() => {
    if (sseProgress) {
      fetchProject();
      fetchCommits();
    }
  }, [sseProgress]);

  const allLogs = [...logs, ...sseLogs].slice(-500);

  const action = async (fn: () => Promise<any>, name: string) => {
    setActionLoading(name);
    setError(null);
    try {
      await fn();
      await fetchProject();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePushAll = async () => {
    if (!id) return;
    setPushLoading(true);
    try {
      try {
        await githubApi.push({ projectId: id });
      } catch (err: any) {
        if (err.message?.includes('fetch first') || err.message?.includes('non-fast-forward') || err.message?.includes('rejected') || err.message?.includes('diverged')) {
          await githubApi.push({ projectId: id, force: true });
        } else {
          throw err;
        }
      }
      await fetchCommits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPushLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(`Delete project "${project?.name}"? This cannot be undone.`)) return;
    try {
      await projectsApi.delete(id);
      navigate('/projects');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={28} className="mx-auto mb-3 text-indigo-500 animate-spin" />
          <div className="text-sm text-zinc-500">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-rose-400" />
        <div className="text-zinc-400 mb-2">Project not found</div>
        <button onClick={() => navigate('/projects')} className="btn-secondary">← Back to Projects</button>
      </div>
    );
  }

  const commitsDone = commits.length;
  const progressPct = Math.min(project.overallProgress ?? 0, 100);
  const canGenerate = ['IDLE', 'PLAN_READY'].includes(project.status);
  const canStart = ['PLAN_READY', 'IDLE'].includes(project.status) && !!project.plan;
  const canPause = project.status === 'RUNNING';
  const canResume = project.status === 'PAUSED';
  const canStop = ['RUNNING', 'PAUSED'].includes(project.status);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Cpu },
    { id: 'plan', label: 'Dev Plan', icon: List },
    { id: 'commits', label: `Commits (${commitsDone})`, icon: GitCommit },
    { id: 'logs', label: 'Logs', icon: Terminal },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/projects')} className="mt-1 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-sm text-zinc-500 mt-1 max-w-xl line-clamp-2">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleDelete} className="btn-secondary p-2 text-zinc-600 hover:text-rose-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Agent state */}
      <AgentStateIndicator state={project.agentState} task={project.currentTaskTitle} />

      {/* Progress block */}
      <div className="card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div>
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Calendar size={11} />Day</div>
            <div className="text-xl font-bold font-mono text-zinc-100">{project.currentDay}<span className="text-zinc-600 text-sm">/{project.durationDays}</span></div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><GitCommit size={11} />Commits</div>
            <div className="text-xl font-bold font-mono text-zinc-100">{commitsDone}<span className="text-zinc-600 text-sm">/{project.totalPlannedCommits}</span></div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><List size={11} />Tasks</div>
            <div className="text-xl font-bold font-mono text-zinc-100">{project.completedTasks}<span className="text-zinc-600 text-sm">/{project.totalTasks}</span></div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><CheckCircle2 size={11} />Tests</div>
            <div className="text-xl font-bold font-mono text-zinc-100">{project.testsPassingPct?.toFixed(0) ?? 100}<span className="text-zinc-600 text-sm">%</span></div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>Overall Progress</span>
            <span className="font-mono text-zinc-300">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 transition-all duration-700 relative"
              style={{ width: `${progressPct}%` }}
            >
              {project.status === 'RUNNING' && (
                <div className="absolute right-0 top-0 h-full w-4 rounded-full bg-white/30 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {canGenerate && (
          <button
            onClick={() => action(() => projectsApi.generatePlan(project.id), 'generate')}
            disabled={!!actionLoading}
            className="btn-primary flex items-center gap-2"
          >
            {actionLoading === 'generate' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Generate AI Plan
          </button>
        )}
        {canStart && (
          <button
            onClick={() => action(() => projectsApi.start(project.id), 'start')}
            disabled={!!actionLoading}
            className="btn-primary flex items-center gap-2"
          >
            {actionLoading === 'start' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Start Agent
          </button>
        )}
        {canPause && (
          <button
            onClick={() => action(() => projectsApi.pause(project.id), 'pause')}
            disabled={!!actionLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {actionLoading === 'pause' ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
            Pause
          </button>
        )}
        {canResume && (
          <button
            onClick={() => action(() => projectsApi.resume(project.id), 'resume')}
            disabled={!!actionLoading}
            className="btn-primary flex items-center gap-2"
          >
            {actionLoading === 'resume' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Resume
          </button>
        )}
        {canStop && (
          <button
            onClick={() => action(() => projectsApi.stop(project.id), 'stop')}
            disabled={!!actionLoading}
            className="btn-secondary flex items-center gap-2 text-rose-400"
          >
            {actionLoading === 'stop' ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
            Stop
          </button>
        )}
        <button
          onClick={() => action(() => projectsApi.runNext(project.id), 'run-next')}
          disabled={!!actionLoading || project.status === 'RUNNING'}
          className="btn-secondary flex items-center gap-2"
        >
          {actionLoading === 'run-next' ? <Loader2 size={14} className="animate-spin" /> : <SkipForward size={14} />}
          Run Next
        </button>
        <button
          onClick={() => { fetchProject(); fetchCommits(); fetchLogs(); }}
          className="btn-secondary p-2"
        >
          <RefreshCw size={14} />
        </button>
        {project.githubRepoUrl && (
          <button
            onClick={handlePushAll}
            disabled={pushLoading}
            className="btn-secondary flex items-center gap-2 ml-auto"
          >
            {pushLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Push to GitHub
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e2a3d]">
        <div className="flex gap-0">
          {tabs.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all',
                tab === tabId
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Repository info */}
          {project.repository && (
            <div className="card p-4">
              <div className="section-title mb-3">Repository</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-zinc-500 mb-1">Local Path</div>
                  <div className="font-mono text-zinc-300 truncate">{project.repository.localPath || 'Not initialized'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 mb-1">Branch</div>
                  <div className="font-mono text-zinc-300 flex items-center gap-1"><GitBranch size={11} />{project.githubBranch}</div>
                </div>
                {project.githubRepoUrl && (
                  <div className="col-span-2">
                    <div className="text-zinc-500 mb-1">Remote URL</div>
                    <a href={project.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-indigo-400 hover:underline truncate block">{project.githubRepoUrl}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plan summary */}
          {project.plan && (
            <div className="card p-4">
              <div className="section-title mb-3">Architecture Overview</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Type', value: project.plan.applicationType },
                  { label: 'Frontend', value: project.plan.frontendStack },
                  { label: 'Backend', value: project.plan.backendStack },
                  { label: 'Database', value: project.plan.databaseStack },
                  { label: 'Auth', value: project.plan.authStrategy },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-zinc-500 mb-1">{label}</div>
                    <div className="text-zinc-300 leading-relaxed">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent commits preview */}
          {commits.length > 0 && (
            <div className="card p-4">
              <div className="section-title mb-3">Recent Commits</div>
              {commits.slice(0, 5).map((c) => (
                <CommitItem key={c.id} commit={c} />
              ))}
              {commits.length > 5 && (
                <button onClick={() => setTab('commits')} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2">
                  View all {commits.length} commits →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'plan' && (
        <div>
          {!project.plan ? (
            <div className="card p-12 text-center">
              <Zap size={32} className="mx-auto mb-3 text-indigo-600" />
              <div className="text-sm text-zinc-400 mb-1">No plan generated yet</div>
              <div className="text-xs text-zinc-600 mb-4">Click "Generate AI Plan" to create your development roadmap</div>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 card text-xs text-zinc-400 leading-relaxed">{project.plan.summary}</div>
              {project.plan.days.map((day) => (
                <DayPlanView key={day.id} day={day} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'commits' && (
        <div className="card p-4">
          {commits.length === 0 ? (
            <div className="text-center py-12">
              <GitCommit size={32} className="mx-auto mb-3 text-zinc-700" />
              <div className="text-sm text-zinc-500">No commits yet — start the agent to begin</div>
            </div>
          ) : (
            <div>
              {commits.map((c) => (
                <CommitItem key={c.id} commit={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <LogConsole logs={allLogs} maxHeight="600px" />
      )}
    </div>
  );
}
