// Axios/Fetch-based API client for CommitFlow AI
const BASE_URL = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: any,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// Typed helpers
export const projectsApi = {
  list: () => api.get<{ success: boolean; data: Project[] }>('/projects'),
  get: (id: string) => api.get<{ success: boolean; data: ProjectDetail }>(`/projects/${id}`),
  create: (body: CreateProjectInput) => api.post<{ success: boolean; data: Project }>('/projects', body),
  update: (id: string, body: Partial<CreateProjectInput>) => api.put<{ success: boolean; data: Project }>(`/projects/${id}`, body),
  delete: (id: string) => api.delete<{ success: boolean }>(`/projects/${id}`),
  generatePlan: (id: string) => api.post<{ success: boolean; data: any }>(`/projects/${id}/generate-plan`),
  getPlan: (id: string) => api.get<{ success: boolean; data: DevelopmentPlan }>(`/projects/${id}/plan`),
  start: (id: string) => api.post<{ success: boolean; message: string }>(`/projects/${id}/start`),
  pause: (id: string) => api.post<{ success: boolean; message: string }>(`/projects/${id}/pause`),
  resume: (id: string) => api.post<{ success: boolean; message: string }>(`/projects/${id}/resume`),
  stop: (id: string) => api.post<{ success: boolean; message: string }>(`/projects/${id}/stop`),
  runNext: (id: string) => api.post<{ success: boolean; message: string }>(`/projects/${id}/run-next`),
  progress: (id: string) => api.get<{ success: boolean; data: ProjectProgress }>(`/projects/${id}/progress`),
  commits: (id: string, page = 1, limit = 100) => api.get<{ success: boolean; data: Commit[]; pagination: any }>(`/projects/${id}/commits?page=${page}&limit=${limit}`),
  logs: (id: string, limit = 200) => api.get<{ success: boolean; data: ExecutionLog[] }>(`/projects/${id}/logs?limit=${limit}`),
  diff: (id: string, hash: string) => api.get<{ success: boolean; data: { diff: string; hash: string } }>(`/projects/${id}/diff?commitHash=${hash}`),
};

export const githubApi = {
  connect: (body: { githubToken: string }) => api.post<any>('/github/connect', body),
  status: (projectId?: string) => api.get<any>(`/github/status${projectId ? `?projectId=${projectId}` : ''}`),
  repositories: () => api.get<any>('/github/repositories'),
  push: (body: { projectId: string; branch?: string; force?: boolean }) => api.post<any>('/github/push', body),
};

export const settingsApi = {
  get: () => api.get<{ success: boolean; data: SystemSettings }>('/settings'),
  update: (body: Partial<SystemSettings>) => api.put<any>('/settings', body),
};

export const dashboardApi = {
  stats: () => api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats'),
};

// Types
export interface Project {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  commitsPerDay: number;
  totalPlannedCommits: number;
  status: ProjectStatus;
  currentDay: number;
  currentTaskIndex: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  overallProgress: number;
  testsPassingPct: number;
  currentTaskTitle?: string;
  agentState: AgentState;
  githubRepoUrl?: string;
  githubBranch: string;
  localRepoPath?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { commits: number };
  repository?: { isConnected: boolean; repoUrl?: string };
}

export interface ProjectDetail extends Project {
  plan?: DevelopmentPlan;
  repository?: Repository;
}

export interface DevelopmentPlan {
  id: string;
  summary: string;
  applicationType: string;
  frontendStack: string;
  backendStack: string;
  databaseStack: string;
  authStrategy: string;
  apiStructure: string;
  aiFeatures: string;
  testingStrategy: string;
  deploymentConfig: string;
  architectureNotes: string;
  days: Day[];
}

export interface Day {
  id: string;
  dayNumber: number;
  title: string;
  focusArea: string;
  status: string;
  tasks: Task[];
}

export type DayPlan = Day;

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  category: string;
  order: number;
  status: TaskStatus;
  targetFiles: string;
  prerequisites: string;
  expectedChanges?: string;
  reasoning?: string;
  commit?: Commit;
}

export type TaskPlan = Task;

export interface Commit {
  id: string;
  projectId: string;
  dayNumber: number;
  commitNumber: number;
  commitHash: string;
  shortHash: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  filesChanged: string;
  filesCount: number;
  diffSummary?: string;
  status: string;
  testResult?: string;
  testDetails?: string;
  aiReasoning?: string;
  pushedToRemote: boolean;
  pushedDate?: string | null;
  createdAt: string;
  task?: { title: string; category: string; description: string };
}

export interface ExecutionLog {
  id: string;
  projectId?: string;
  level: string;
  stage: string;
  step?: string;
  message: string;
  details?: string;
  createdAt: string;
  timestamp?: string;
}

export interface Repository {
  id: string;
  repoUrl?: string;
  repoName?: string;
  localPath: string;
  isCloned?: boolean;
  isConnected: boolean;
  defaultBranch: string;
  lastCommitHash?: string | null;
}

export interface ProjectProgress {
  id: string;
  name: string;
  status: ProjectStatus;
  agentState: AgentState;
  currentDay: number;
  durationDays: number;
  currentTaskIndex: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  overallProgress: number;
  testsPassingPct: number;
  totalPlannedCommits: number;
  currentTaskTitle?: string;
  commitsPerDay: number;
  _count?: { commits: number };
}

export interface SystemSettings {
  id: string;
  githubToken?: string;
  githubUsername?: string;
  gitAuthorName?: string;
  gitAuthorEmail?: string;
  aiProvider: string;
  aiApiKey?: string;
  aiModel: string;
  autoPushOnCommit: boolean;
  executionSpeedMs: number;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalCommits: number;
  totalLogs: number;
  recentProjects: Project[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
  durationDays: number;
  commitsPerDay: number;
  githubRepoUrl?: string;
  githubBranch: string;
}

export type ProjectStatus = 'IDLE' | 'ANALYZING' | 'PLAN_READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
export type AgentState = 'IDLE' | 'WORKING' | 'TESTING' | 'COMMITTING' | 'PUSHING' | 'PAUSED' | 'ERROR';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
