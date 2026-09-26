import React, { useState, useEffect } from 'react';
import { dashboardApi, projectsApi } from '../api/client';
import type { DashboardStats, Project } from '../api/client';
import ProjectCard from '../components/ProjectCard';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2, GitCommit, Zap, CheckCircle2, Plus,
  TrendingUp, Activity, AlertTriangle
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-100 font-mono">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const res = await dashboardApi.stats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-zinc-500">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Autonomous AI development engine overview</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={stats?.totalProjects ?? 0}
          icon={FolderGit2}
          color="bg-indigo-500/15 text-indigo-400"
        />
        <StatCard
          label="Active Now"
          value={stats?.activeProjects ?? 0}
          icon={Activity}
          color="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          label="Completed"
          value={stats?.completedProjects ?? 0}
          icon={CheckCircle2}
          color="bg-cyan-500/15 text-cyan-400"
        />
        <StatCard
          label="Total Commits"
          value={stats?.totalCommits ?? 0}
          icon={GitCommit}
          color="bg-purple-500/15 text-purple-400"
        />
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" />
            Recent Projects
          </h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all →
          </button>
        </div>

        {!stats?.recentProjects?.length ? (
          <div className="card p-12 text-center">
            <FolderGit2 size={40} className="mx-auto mb-4 text-zinc-700" />
            <h3 className="text-sm font-medium text-zinc-400 mb-2">No projects yet</h3>
            <p className="text-xs text-zinc-600 mb-4">Create your first AI-driven software project</p>
            <button onClick={() => navigate('/projects/new')} className="btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.recentProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="card-glass p-5 flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-indigo-600/20 flex-shrink-0">
          <Zap size={18} className="text-indigo-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-200 mb-1">CommitFlow AI Engine</div>
          <div className="text-xs text-zinc-500 leading-relaxed">
            Create a project, generate an AI development plan, and watch the autonomous agent implement your software
            through real, incremental Git commits — no empty commits, no fake activity.
            Each commit corresponds to a genuine code change with test validation.
          </div>
        </div>
      </div>
    </div>
  );
}
