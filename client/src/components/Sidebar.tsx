import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderGit2, Plus, Settings, GitBranch,
  Terminal, Activity, Layers, GitCommit, ChevronRight
} from 'lucide-react';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderGit2, label: 'Projects' },
  { to: '/projects/new', icon: Plus, label: 'New Project' },
];

const workspaceNavItems = [
  { to: '/plan', icon: Layers, label: 'Master Plan' },
  { to: '/progress', icon: Activity, label: 'Daily Progress' },
  { to: '/commits', icon: GitCommit, label: 'Commit Timeline' },
  { to: '/logs', icon: Terminal, label: 'Execution Logs' },
  { to: '/repository', icon: FolderGit2, label: 'Git Repository' },
];

const systemNavItems = [
  { to: '/settings', icon: Settings, label: 'System Settings' },
];

export default function Sidebar() {
  const location = useLocation();

  const renderLink = (to: string, Icon: any, label: string) => {
    const isActive = to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(to);

    return (
      <NavLink
        key={to}
        to={to}
        className={
          isActive
            ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-indigo-600/10 text-indigo-400 font-medium border border-indigo-500/20 transition-all'
            : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all'
        }
      >
        <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
        <span className="truncate">{label}</span>
        {isActive && <ChevronRight size={12} className="ml-auto text-indigo-400 shrink-0" />}
      </NavLink>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#070a10] border-r border-[#1a2235] flex flex-col z-30 select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1a2235]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <GitBranch size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-tight">CommitFlow</div>
          <div className="text-[10px] text-indigo-400 font-mono">Autonomous AI Git</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-none">
        {/* Main Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 px-3 pb-1 tracking-wider font-semibold">
            Overview
          </div>
          {mainNavItems.map(({ to, icon, label }) => renderLink(to, icon, label))}
        </div>

        {/* Autonomous Workspace Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 px-3 pb-1 tracking-wider font-semibold">
            Agent Workspace
          </div>
          {workspaceNavItems.map(({ to, icon, label }) => renderLink(to, icon, label))}
        </div>

        {/* Configuration Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 px-3 pb-1 tracking-wider font-semibold">
            Configuration
          </div>
          {systemNavItems.map(({ to, icon, label }) => renderLink(to, icon, label))}
        </div>
      </nav>

      {/* Footer status */}
      <div className="p-4 border-t border-[#1a2235]">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="min-w-0">
            <div className="text-xs text-emerald-400 font-medium truncate">AI Engine Active</div>
            <div className="text-[10px] text-zinc-500 font-mono truncate">localhost:5000</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
