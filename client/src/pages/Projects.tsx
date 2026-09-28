import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/client';
import type { Project } from '../api/client';
import ProjectCard from '../components/ProjectCard';
import { Plus, FolderGit2, Loader2, Search, Download, Github, X } from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    projectsApi.list().then((r) => setProjects(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await projectsApi.importGitHub(importUrl.trim());
      setShowImportModal(false);
      setImportUrl('');
      navigate(`/projects/${res.data.id}`);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import repository from GitHub');
    } finally {
      setImporting(false);
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-all flex items-center gap-2 border border-zinc-700/60"
          >
            <Download size={15} className="text-emerald-400" />
            <span>Import from GitHub</span>
          </button>

          <button onClick={() => navigate('/projects/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="input pl-9"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderGit2 size={40} className="mx-auto mb-4 text-zinc-700" />
          <div className="text-sm font-medium text-zinc-400 mb-2">
            {search ? 'No matching projects' : 'No projects yet'}
          </div>
          <div className="text-xs text-zinc-600 mb-4">
            {search ? 'Try a different search term' : 'Create your first AI project or import from GitHub'}
          </div>
          {!search && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-all flex items-center gap-2 border border-zinc-700"
              >
                <Download size={14} className="text-emerald-400" /> Import GitHub Repo
              </button>
              <button onClick={() => navigate('/projects/new')} className="btn-primary inline-flex items-center gap-2">
                <Plus size={14} /> Create Project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Github size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Import Project from GitHub</h3>
                <p className="text-xs text-slate-400">Restore your project commits and progress percentage from GitHub</p>
              </div>
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {importError}
              </div>
            )}

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 mb-1.5 block font-medium">GitHub Repository URL</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://github.com/manasha1232/AI-Study-Planner"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !importUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Syncing Commits...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Import & Restore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
