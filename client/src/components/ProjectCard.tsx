import React from 'react';
import type { Project } from '../api/client';
import type { AgentState, ProjectStatus } from '../api/client';
import { GitCommit, Calendar, CheckCircle, Play, Pause, SkipForward, AlertTriangle } from 'lucide-react';
import { projectsApi } from '../api/client';

function statusBadge(status: ProjectStatus) {
  switch (status) {
    case 'RUNNING': return <span className="badge-running"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" /> Running</span>;
    case 'COMPLETED': return <span className="badge-success"><CheckCircle size={10} /> Completed</span>;
    case 'PAUSED': return <span className="badge-warning">Paused</span>;
    case 'FAILED': return <span className="badge-error"><AlertTriangle size={10} /> Failed</span>;
    case 'PLAN_READY': return <span className="badge bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">Plan Ready</span>;
    case 'ANALYZING': return <span className="badge-running"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block" /> Analyzing</span>;
    default: return <span className="badge-idle">Idle</span>;
  }
}

function agentDot(state: AgentState) {
  if (state === 'WORKING' || state === 'COMMITTING' || state === 'TESTING' || state === 'PUSHING') {
    return <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-300"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />Agent active</span>;
  }
  if (state === 'ERROR') return <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Error</span>;
  return null;
}

interface Props {
  project: Project;
  onClick?: () => void;
  onRefresh?: () => void;
}

export default function ProjectCard({ project, onClick, onRefresh }: Props) {
  const commitsDone = project._count?.commits ?? 0;
  const progressPct = Math.min(project.overallProgress ?? 0, 100);

  const handleAction = async (e: React.MouseEvent, action: 'start' | 'pause' | 'next') => {
    e.stopPropagation();
    try {
      if (action === 'start') {
        if (project.status === 'IDLE' || !project.status) {
          await projectsApi.generatePlan(project.id);
        }
        await projectsApi.start(project.id);
      } else if (action === 'pause') {
        await projectsApi.pause(project.id);
      } else if (action === 'next') {
        await projectsApi.runNext(project.id);
      }
      onRefresh?.();
    } catch (err) {
      console.error('Project action failed:', err);
    }
  };

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:border-indigo-500/40 hover:bg-[#101826] transition-all duration-200 group flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">{project.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{project.description}</p>
          </div>
          <div className="ml-3 flex-shrink-0">{statusBadge(project.status)}</div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
            <span>Progress</span>
            <span className="font-mono text-zinc-300">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-1 rounded-full bg-zinc-800/80">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
            <div className="text-xs font-mono text-zinc-100">{project.currentDay}/{project.durationDays}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center justify-center gap-1"><Calendar size={9} />Day</div>
          </div>
          <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
            <div className="text-xs font-mono text-zinc-100">{commitsDone}/{project.totalPlannedCommits}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center justify-center gap-1"><GitCommit size={9} />Commits</div>
          </div>
          <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
            <div className="text-xs font-mono text-zinc-100">{project.testsPassingPct?.toFixed(0) ?? 100}%</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center justify-center gap-1"><CheckCircle size={9} />Tests</div>
          </div>
        </div>
      </div>

      {/* Footer controls & agent status */}
      <div className="pt-2.5 border-t border-zinc-900/80 flex items-center justify-between mt-2">
        <div className="min-w-0 flex-1">
          {agentDot(project.agentState) || (
            <span className="text-[11px] text-zinc-500 font-mono truncate">Ready</span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {project.status === 'RUNNING' ? (
            <button
              onClick={(e) => handleAction(e, 'pause')}
              title="Pause Execution"
              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all text-xs flex items-center gap-1"
            >
              <Pause size={12} /> Pause
            </button>
          ) : (
            <button
              onClick={(e) => handleAction(e, 'start')}
              title="Run AI Agent"
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-medium transition-all text-xs flex items-center gap-1"
            >
              <Play size={11} fill="currentColor" /> Run Agent
            </button>
          )}

          <button
            onClick={(e) => handleAction(e, 'next')}
            title="Run Next Task"
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-all text-xs"
          >
            <SkipForward size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
