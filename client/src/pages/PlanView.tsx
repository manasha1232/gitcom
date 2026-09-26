import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, CheckCircle, Clock, FileCode, Layers, Search,
  ArrowRight, Shield, Zap, Sparkles, Filter, Code2, AlertCircle, RefreshCw
} from 'lucide-react';
import { projectsApi } from '../api/client';
import type { Project, DevelopmentPlan, DayPlan, TaskPlan } from '../api/client';

export default function PlanView() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(id || '');
  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDayNumber, setActiveDayNumber] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<TaskPlan | null>(null);
  const [generating, setGenerating] = useState(false);

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

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    Promise.all([
      projectsApi.get(selectedProjectId),
      projectsApi.getPlan(selectedProjectId).catch(() => ({ success: false, data: null })),
    ]).then(([projRes, planRes]) => {
      if (projRes.success) setProject(projRes.data);
      if (planRes.success && planRes.data) {
        setPlan(planRes.data);
      } else {
        setPlan(null);
      }
      setLoading(false);
    });
  }, [selectedProjectId]);

  const handleGeneratePlan = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    try {
      await projectsApi.generatePlan(selectedProjectId);
      const [projRes, planRes] = await Promise.all([
        projectsApi.get(selectedProjectId),
        projectsApi.getPlan(selectedProjectId),
      ]);
      if (projRes.success) setProject(projRes.data);
      if (planRes.success) setPlan(planRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const allTasks = plan?.days.flatMap((d) => d.tasks) || [];
  const categories = Array.from(new Set(allTasks.map((t) => t.category)));

  const filteredDays = plan?.days.filter((d) => {
    if (activeDayNumber !== 'all' && d.dayNumber !== activeDayNumber) return false;
    return true;
  }) || [];

  const getFilteredTasks = (tasks: TaskPlan[]) => {
    return tasks.filter((t) => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
      FEATURE: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      COMPONENT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      BACKEND_API: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      DATABASE_MODEL: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      TEST: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      BUG_FIX: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      VALIDATION: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      AUTH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      UI: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
      AI_FEATURE: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      CONFIG: 'text-zinc-400 bg-zinc-800 border-zinc-700',
      DOCS: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    };
    return map[category] || 'text-zinc-400 bg-zinc-800 border-zinc-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="text-indigo-400" size={24} />
            Master Development Plan
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Autonomous multi-day architectural roadmap and verifiable commit specifications
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
                {p.name} ({p.durationDays}d × {p.commitsPerDay}c)
              </option>
            ))}
          </select>

          {project && (
            <Link to={`/projects/${project.id}`} className="btn-secondary text-xs">
              View Project
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-zinc-500 animate-pulse">
          Loading master development plan...
        </div>
      ) : !plan ? (
        <div className="card p-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No Development Plan Generated</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            CommitFlow AI will synthesize the architecture and generate exactly{' '}
            {project ? project.durationDays * project.commitsPerDay : 'all'} structured tasks.
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Sparkles size={16} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Synthesizing Architecture...' : 'Generate AI Master Plan'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Architecture Summary Banner */}
          <div className="card p-5 border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-zinc-900 to-purple-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="badge badge-indigo">
                    {plan.days.length} Days Roadmap
                  </span>
                  <span className="badge badge-emerald">
                    {allTasks.length} Planned Commits
                  </span>
                  <span className="badge badge-purple font-mono">
                    {plan.applicationType}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">
                  {plan.summary}
                </p>
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="btn-secondary text-xs shrink-0 flex items-center gap-1.5"
                title="Regenerate Plan"
              >
                <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>

            {/* Architecture Stack Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/80">
              <div>
                <div className="text-[10px] uppercase font-mono text-zinc-500">Frontend Stack</div>
                <div className="text-xs text-zinc-300 font-medium truncate">{plan.frontendStack}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-zinc-500">Backend Stack</div>
                <div className="text-xs text-zinc-300 font-medium truncate">{plan.backendStack}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-zinc-500">Database</div>
                <div className="text-xs text-zinc-300 font-medium truncate">{plan.databaseStack}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-zinc-500">Auth Strategy</div>
                <div className="text-xs text-zinc-300 font-medium truncate">{plan.authStrategy}</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search tasks, files, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-9 pr-3 py-1.5 text-xs w-64"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field py-1.5 text-xs"
              >
                <option value="all">All Categories ({allTasks.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c} ({allTasks.filter((t) => t.category === c).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Day Selector Pills */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
              <button
                onClick={() => setActiveDayNumber('all')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  activeDayNumber === 'all'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                All Days
              </button>
              {plan.days.map((d) => (
                <button
                  key={d.dayNumber}
                  onClick={() => setActiveDayNumber(d.dayNumber)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                    activeDayNumber === d.dayNumber
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  D{d.dayNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Days and Tasks List */}
          <div className="space-y-5">
            {filteredDays.map((day) => {
              const dayTasks = getFilteredTasks(day.tasks);
              if (dayTasks.length === 0 && searchQuery) return null;

              const completedCount = day.tasks.filter((t) => t.status === 'COMPLETED').length;
              const progressPct = Math.round((completedCount / (day.tasks.length || 1)) * 100);

              return (
                <div key={day.id || day.dayNumber} className="card p-5 space-y-4">
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          Day {day.dayNumber}
                        </span>
                        <h3 className="text-sm font-bold text-white">{day.title}</h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{day.focusArea}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-mono text-zinc-300">
                          {completedCount}/{day.tasks.length} Commits
                        </div>
                        <div className="text-[10px] text-zinc-500">{progressPct}% completed</div>
                      </div>
                      <div className="w-16 bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tasks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dayTasks.map((task) => {
                      const isCompleted = task.status === 'COMPLETED';
                      const isInProgress = task.status === 'IN_PROGRESS';
                      const targetFiles: string[] = typeof task.targetFiles === 'string'
                        ? JSON.parse(task.targetFiles || '[]')
                        : task.targetFiles || [];

                      return (
                        <div
                          key={task.id || task.taskNumber}
                          onClick={() => setSelectedTask(task)}
                          className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-950/10 border-emerald-900/40 hover:border-emerald-700/60'
                              : isInProgress
                              ? 'bg-indigo-950/20 border-indigo-500/50 ring-1 ring-indigo-500/30'
                              : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-mono text-zinc-500 font-bold">
                              #{task.taskNumber}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getCategoryColor(task.category)}`}>
                              {task.category}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 mb-1.5">
                            {task.title}
                          </h4>

                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
                            {task.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono">
                            <span className="flex items-center gap-1">
                              <FileCode size={11} />
                              {targetFiles.length} files
                            </span>
                            {isCompleted ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-sans">
                                <CheckCircle size={11} /> Committed
                              </span>
                            ) : isInProgress ? (
                              <span className="text-indigo-400 flex items-center gap-1 font-sans animate-pulse">
                                <Clock size={11} /> Running
                              </span>
                            ) : (
                              <span className="text-zinc-600">Pending</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 border-indigo-500/30">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-zinc-500 font-bold">
                    Task #{selectedTask.taskNumber}
                  </span>
                  <span className={`text-xs font-mono px-2.5 py-0.5 rounded border ${getCategoryColor(selectedTask.category)}`}>
                    {selectedTask.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-zinc-400 hover:text-white text-lg font-mono px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-mono text-zinc-500 uppercase text-[10px] mb-1">Description</div>
                <p className="text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded border border-zinc-800">
                  {selectedTask.description}
                </p>
              </div>

              <div>
                <div className="font-mono text-zinc-500 uppercase text-[10px] mb-1">AI Reasoning & Architecture Context</div>
                <p className="text-zinc-300 leading-relaxed bg-indigo-950/20 border border-indigo-900/40 p-3 rounded text-indigo-200">
                  {selectedTask.reasoning || 'Autonomous architectural implementation step.'}
                </p>
              </div>

              <div>
                <div className="font-mono text-zinc-500 uppercase text-[10px] mb-1">Target Files Changed</div>
                <div className="space-y-1">
                  {(typeof selectedTask.targetFiles === 'string'
                    ? JSON.parse(selectedTask.targetFiles || '[]')
                    : selectedTask.targetFiles || []
                  ).map((f: string, i: number) => (
                    <div
                      key={i}
                      className="font-mono text-[11px] bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 flex items-center gap-2"
                    >
                      <FileCode size={13} className="text-indigo-400" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {selectedTask.expectedChanges && (
                <div>
                  <div className="font-mono text-zinc-500 uppercase text-[10px] mb-1">Expected Changes</div>
                  <div className="font-mono text-[11px] bg-zinc-950 p-2.5 rounded border border-zinc-800 text-emerald-400">
                    {selectedTask.expectedChanges}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <button onClick={() => setSelectedTask(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
