import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/client';
import {
  ArrowLeft, GitBranch, Cpu, Calendar, GitCommit,
  Loader2, CheckCircle2, Link, AlertCircle
} from 'lucide-react';

const EXAMPLE_PROJECTS = [
  {
    name: 'AI Study Planner',
    description: 'Build a full-stack application where students enter their subjects, exams and available study hours. AI generates a personalized study schedule, tracks progress and provides analytics.',
    days: 20,
    commits: 15,
  },
  {
    name: 'AI Expense Manager',
    description: 'Build an AI-powered expense management application with automatic categorization, spending insights, budget tracking, and visual analytics dashboards.',
    days: 14,
    commits: 15,
  },
  {
    name: 'Dev Task Board',
    description: 'A full-featured project management platform with kanban boards, sprint planning, team assignments, GitHub integration, and AI-powered task estimation.',
    days: 10,
    commits: 10,
  },
];

export default function NewProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    durationDays: 20,
    commitsPerDay: 15,
    githubRepoUrl: '',
    githubBranch: 'main',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCommits = form.durationDays * form.commitsPerDay;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await projectsApi.create({
        name: form.name,
        description: form.description,
        durationDays: form.durationDays,
        commitsPerDay: form.commitsPerDay,
        githubRepoUrl: form.githubRepoUrl || undefined,
        githubBranch: form.githubBranch,
      });
      navigate(`/projects/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const applyExample = (ex: typeof EXAMPLE_PROJECTS[0]) => {
    setForm((f) => ({
      ...f,
      name: ex.name,
      description: ex.description,
      durationDays: ex.days,
      commitsPerDay: ex.commits,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Create New Project</h1>
        <p className="text-sm text-zinc-500">Define your project and the AI will generate a complete development plan with real commits.</p>
      </div>

      {/* Example presets */}
      <div className="mb-6">
        <div className="section-title mb-3">Quick Start Examples</div>
        <div className="grid grid-cols-3 gap-2">
          {EXAMPLE_PROJECTS.map((ex) => (
            <button
              key={ex.name}
              onClick={() => applyExample(ex)}
              className="text-left p-3 card hover:border-indigo-500/40 hover:bg-[#101826] transition-all rounded-lg"
            >
              <div className="text-xs font-medium text-zinc-300 mb-1">{ex.name}</div>
              <div className="text-[10px] text-zinc-600">{ex.days}d × {ex.commits}/day = {ex.days * ex.commits} commits</div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Project Name *</label>
          <input
            className="input"
            placeholder="e.g. AI Study Planner"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="label">Project Description *</label>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder="Describe what you want to build in detail. The AI will analyze this to generate a tailored development plan with specific features, components, and architecture..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            minLength={20}
          />
          <div className="text-[10px] text-zinc-600 mt-1">{form.description.length} / 5000 characters</div>
        </div>

        {/* Duration & commits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-2">
              <Calendar size={11} /> Duration (Days)
            </label>
            <input
              type="number"
              className="input"
              min={1} max={365}
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <GitCommit size={11} /> Commits per Day
            </label>
            <input
              type="number"
              className="input"
              min={1} max={50}
              value={form.commitsPerDay}
              onChange={(e) => setForm((f) => ({ ...f, commitsPerDay: parseInt(e.target.value) || 1 }))}
            />
          </div>
        </div>

        {/* Total commits badge */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20">
          <Cpu size={16} className="text-indigo-400" />
          <div>
            <div className="text-sm text-indigo-300 font-semibold">{totalCommits} meaningful commits planned</div>
            <div className="text-xs text-zinc-500">{form.durationDays} days × {form.commitsPerDay} commits/day — each corresponding to a real code change</div>
          </div>
        </div>

        {/* GitHub section */}
        <div className="border-t border-[#1e2a3d] pt-5 space-y-4">
          <div className="section-title flex items-center gap-2">
            <GitBranch size={11} /> GitHub Integration (Optional)
          </div>
          <div>
            <label className="label flex items-center gap-2"><Link size={11} /> Repository URL</label>
            <input
              className="input font-mono"
              placeholder="https://github.com/username/repo"
              value={form.githubRepoUrl}
              onChange={(e) => setForm((f) => ({ ...f, githubRepoUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Branch</label>
            <input
              className="input font-mono"
              placeholder="main"
              value={form.githubBranch}
              onChange={(e) => setForm((f) => ({ ...f, githubBranch: e.target.value }))}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Creating Project...</>
          ) : (
            <><CheckCircle2 size={16} /> Create Project & Initialize Repository</>
          )}
        </button>
      </form>
    </div>
  );
}
