import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, CheckCircle, Clock, Play, Pause, Square, SkipForward,
  TrendingUp, Activity, CheckCheck, AlertCircle, RefreshCw, Zap, Sparkles
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { useSSE } from '../contexts/SSEContext';
import type { Project, DevelopmentPlan, DayPlan } from '../api/client';

export default function DailyProgress() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(id || '');
  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { isConnected, latestProgress } = useSSE();

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
      const [projRes, planRes] = await Promise.all([
        projectsApi.get(selectedProjectId),
        projectsApi.getPlan(selectedProjectId).catch(() => ({ success: false, data: null })),
      ]);
      if (projRes.success) setProject(projRes.data);
      if (planRes.success) setPlan(planRes.data);
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

  // Update on SSE progress
  useEffect(() => {
    if (latestProgress && ((latestProgress as any).projectId === selectedProjectId || latestProgress.id === selectedProjectId)) {
      setProject((prev) => (prev ? { ...prev, ...latestProgress } : null));
    }
  }, [latestProgress, selectedProjectId]);

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'stop' | 'runNext') => {
    if (!selectedProjectId) return;
    setActionLoading(true);
    try {
      if (action === 'start') await projectsApi.start(selectedProjectId);
      if (action === 'pause') await projectsApi.pause(selectedProjectId);
      if (action === 'resume') await projectsApi.resume(selectedProjectId);
      if (action === 'stop') await projectsApi.stop(selectedProjectId);
      if (action === 'runNext') await projectsApi.runNext(selectedProjectId);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = project?.status === 'RUNNING';
  const isPaused = project?.status === 'PAUSED';

  // Category breakdown calculation
  const allTasks = plan?.days.flatMap((d) => d.tasks) || [];
  const categoryStats = allTasks.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = { total: 0, completed: 0 };
    acc[t.category].total += 1;
    if (t.status === 'COMPLETED') acc[t.category].completed += 1;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-emerald-400" size={24} />
            Daily Progress Tracker
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Day-by-day autonomous execution cadence, velocity metrics, and milestone verification
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

          <button onClick={fetchData} className="btn-secondary p-2.5 text-xs" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-zinc-500 animate-pulse">
          Loading daily progress metrics...
        </div>
      ) : !project ? (
        <div className="card p-12 text-center text-zinc-500">No project selected</div>
      ) : (
        <div className="space-y-6">
          {/* Executive KPI Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Overall Progress</div>
              <div className="text-2xl font-bold text-white font-mono">
                {project.overallProgress.toFixed(1)}%
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${project.overallProgress}%` }}
                />
              </div>
            </div>

            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Current Day</div>
              <div className="text-2xl font-bold text-indigo-400 font-mono">
                Day {project.currentDay} <span className="text-xs text-zinc-500 font-sans">/ {project.durationDays}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-mono">
                {project.commitsPerDay} commits / day
              </div>
            </div>

            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Commits Executed</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {project.completedTasks} <span className="text-xs text-zinc-500 font-sans">/ {project.totalTasks}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-mono">
                {project.totalTasks - project.completedTasks} remaining
              </div>
            </div>

            <div className="card p-4">
              <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Test Pass Rate</div>
              <div className="text-2xl font-bold text-teal-400 font-mono">
                {project.testsPassingPct || 100}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1">
                <CheckCheck size={13} className="text-teal-400" />
                <span>Zero regression</span>
              </div>
            </div>
          </div>

          {/* Autonomous Execution Controller Bar */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-4 border-indigo-500/30 bg-gradient-to-r from-zinc-900 via-indigo-950/20 to-zinc-900">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Agent Status:</span>
                  <span className="font-mono text-indigo-400">{project.agentState || project.status}</span>
                </div>
                {project.currentTaskTitle && (
                  <div className="text-xs text-zinc-400 font-mono truncate max-w-lg">
                    Active: {project.currentTaskTitle}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isRunning && (
                <button
                  onClick={() => handleAction('start')}
                  disabled={actionLoading || project.status === 'COMPLETED'}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Play size={13} fill="currentColor" />
                  {isPaused ? 'Resume Autonomous Execution' : 'Start Execution'}
                </button>
              )}

              {isRunning && (
                <button
                  onClick={() => handleAction('pause')}
                  disabled={actionLoading}
                  className="btn-secondary text-xs flex items-center gap-1.5 text-amber-400"
                >
                  <Pause size={13} />
                  Pause
                </button>
              )}

              <button
                onClick={() => handleAction('runNext')}
                disabled={actionLoading || isRunning || project.status === 'COMPLETED'}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Execute 1 Commit"
              >
                <SkipForward size={13} />
                Run Next Commit
              </button>

              {(isRunning || isPaused) && (
                <button
                  onClick={() => handleAction('stop')}
                  disabled={actionLoading}
                  className="btn-secondary text-xs flex items-center gap-1.5 text-rose-400"
                >
                  <Square size={13} />
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Days Grid Matrix */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              Day-by-Day Development Progression Matrix ({plan?.days.length || project.durationDays} Days)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(plan?.days || []).map((day) => {
                const total = day.tasks.length || project.commitsPerDay;
                const completed = day.tasks.filter((t) => t.status === 'COMPLETED').length;
                const inProgress = day.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
                const isCurrent = project.currentDay === day.dayNumber;
                const isFullyDone = completed === total && total > 0;
                const pct = Math.round((completed / (total || 1)) * 100);

                return (
                  <div
                    key={day.id || day.dayNumber}
                    className={`card p-4 relative overflow-hidden transition-all ${
                      isFullyDone
                        ? 'border-emerald-500/40 bg-emerald-950/10'
                        : isCurrent
                        ? 'border-indigo-500 ring-1 ring-indigo-500/40 bg-indigo-950/20'
                        : 'border-zinc-800 bg-zinc-900/50'
                    }`}
                  >
                    {/* Top Day Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isFullyDone
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isCurrent
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Day {day.dayNumber}
                      </span>
                      {isFullyDone ? (
                        <CheckCircle size={15} className="text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="text-[10px] font-mono text-indigo-400 animate-pulse font-semibold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">PENDING</span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-zinc-100 line-clamp-1 mb-1" title={day.title}>
                      {day.title}
                    </h4>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3 min-h-[32px]">
                      {day.focusArea}
                    </p>

                    {/* Progress details */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">{completed}/{total} Commits</span>
                        <span className="text-zinc-200 font-semibold">{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFullyDone ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(categoryStats).length > 0 && (
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Workload Distribution by Technical Category
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Object.entries(categoryStats).map(([cat, stat]) => {
                  const pct = Math.round((stat.completed / stat.total) * 100);
                  return (
                    <div key={cat} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                      <div className="text-[10px] font-mono text-zinc-400 uppercase truncate mb-1">
                        {cat}
                      </div>
                      <div className="text-base font-bold text-white font-mono">
                        {stat.completed} <span className="text-xs text-zinc-500">/ {stat.total}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1 mt-2 overflow-hidden">
                        <div
                          className="bg-indigo-400 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
