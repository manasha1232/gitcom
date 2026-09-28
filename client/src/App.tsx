import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetails from './pages/ProjectDetails';
import PlanView from './pages/PlanView';
import DailyProgress from './pages/DailyProgress';
import CommitTimeline from './pages/CommitTimeline';
import LogsConsole from './pages/LogsConsole';
import RepoSettings from './pages/RepoSettings';
import Settings from './pages/Settings';
import { Login } from './pages/Login';
import { SSEProvider } from './contexts/SSEContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AuthenticatedApp() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#070a10]">
      <Sidebar />
      <main className="ml-56 flex-1 overflow-y-auto bg-[#070a10] text-zinc-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            {/* 1. Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* 2. Projects List */}
            <Route path="/projects" element={<Projects />} />

            {/* 3. Create New Project */}
            <Route path="/projects/new" element={<NewProject />} />

            {/* 4. Project Details Hub */}
            <Route path="/projects/:id" element={<ProjectDetails />} />

            {/* 5. Master Development Plan View */}
            <Route path="/plan" element={<PlanView />} />
            <Route path="/projects/:id/plan" element={<PlanView />} />

            {/* 6. Daily Progress Tracker */}
            <Route path="/progress" element={<DailyProgress />} />
            <Route path="/projects/:id/progress" element={<DailyProgress />} />

            {/* 7. Commit Timeline & Git History */}
            <Route path="/commits" element={<CommitTimeline />} />
            <Route path="/projects/:id/commits" element={<CommitTimeline />} />

            {/* 8. Real-Time Execution Logs Console */}
            <Route path="/logs" element={<LogsConsole />} />
            <Route path="/projects/:id/logs" element={<LogsConsole />} />

            {/* 9. Repository Configuration & Settings */}
            <Route path="/repository" element={<RepoSettings />} />
            <Route path="/projects/:id/repository" element={<RepoSettings />} />

            {/* 10. System Settings */}
            <Route path="/settings" element={<Settings />} />

            {/* 404 Fallback */}
            <Route
              path="*"
              element={
                <div className="card p-12 text-center my-12 max-w-md mx-auto space-y-3">
                  <div className="text-4xl font-bold font-mono text-indigo-400">404</div>
                  <div className="text-sm text-zinc-300 font-semibold">Page Not Found</div>
                  <p className="text-xs text-zinc-500">The requested route does not exist.</p>
                </div>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SSEProvider>
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </SSEProvider>
    </AuthProvider>
  );
}
