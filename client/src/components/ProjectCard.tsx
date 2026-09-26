import React from 'react';
import type { Project } from '../api/client';
import type { AgentState, ProjectStatus } from '../api/client';
import { GitCommit, Calendar, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

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
}

export default function ProjectCard({ project, onClick }: Props) {
  const commitsDone = project._count?.commits ?? 0;
  const progressPct = Math.min(project.overallProgress ?? 0, 100);

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:border-indigo-500/40 hover:bg-[#101826] transition-all duration-200 group"
    >
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

      {/* Agent state */}
      {agentDot(project.agentState) && (
        <div className="mt-1">{agentDot(project.agentState)}</div>
      )}
      {project.currentTaskTitle && (
        <p className="text-[11px] text-zinc-500 mt-1 truncate font-mono">↳ {project.currentTaskTitle}</p>
      )}
    </div>
  );
}
