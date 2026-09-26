import { prisma } from '../prisma';
import { agentEngine } from './agentEngine';
import { sseService } from './sseService';

interface SchedulerJob {
  projectId: string;
  timer: ReturnType<typeof setTimeout> | null;
  isRunning: boolean;
  isPaused: boolean;
  currentAgentRunId?: string;
}

class SchedulerService {
  private jobs: Map<string, SchedulerJob> = new Map();
  private executionSpeedMs = 2500;

  async startProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const existing = this.jobs.get(projectId);
    if (existing?.isRunning && !existing.isPaused) {
      return { success: false, message: 'Project is already running' };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        plan: {
          include: {
            days: {
              include: { tasks: { orderBy: { order: 'asc' } } },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!project) return { success: false, message: 'Project not found' };
    if (!project.plan) return { success: false, message: 'No development plan generated yet. Generate a plan first.' };

    const settings = await prisma.systemSettings.findFirst();
    this.executionSpeedMs = settings?.executionSpeedMs ?? 2500;

    // Create AgentRun record
    const agentRun = await prisma.agentRun.create({
      data: {
        projectId,
        status: 'RUNNING',
        currentAction: 'Starting autonomous execution engine...',
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'RUNNING', agentState: 'WORKING' },
    });

    const job: SchedulerJob = {
      projectId,
      timer: null,
      isRunning: true,
      isPaused: false,
      currentAgentRunId: agentRun.id,
    };

    this.jobs.set(projectId, job);
    this.scheduleNextTask(projectId);
    return { success: true, message: 'Autonomous agent started successfully' };
  }

  async pauseProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const job = this.jobs.get(projectId);
    if (!job) return { success: false, message: 'Project is not running' };

    job.isPaused = true;
    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PAUSED', agentState: 'PAUSED' },
    });

    sseService.sendAgentState(projectId, 'PAUSED', 'Execution paused by user');
    return { success: true, message: 'Execution paused' };
  }

  async resumeProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const job = this.jobs.get(projectId);
    if (!job) return this.startProject(projectId);

    job.isPaused = false;
    job.isRunning = true;

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'RUNNING', agentState: 'WORKING' },
    });

    sseService.sendAgentState(projectId, 'WORKING', 'Resuming execution...');
    this.scheduleNextTask(projectId);
    return { success: true, message: 'Execution resumed' };
  }

  async stopProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const job = this.jobs.get(projectId);
    if (job) {
      job.isRunning = false;
      job.isPaused = false;
      if (job.timer) {
        clearTimeout(job.timer);
        job.timer = null;
      }
      this.jobs.delete(projectId);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'IDLE', agentState: 'IDLE', currentTaskTitle: null },
    });

    sseService.sendAgentState(projectId, 'IDLE', undefined);
    return { success: true, message: 'Execution stopped' };
  }

  async runNextTask(projectId: string): Promise<{ success: boolean; message: string }> {
    const task = await this.getNextPendingTask(projectId);
    if (!task) {
      return { success: false, message: 'No pending tasks remaining in the plan' };
    }
    await agentEngine.executeTask(projectId, task.id);
    return { success: true, message: `Task "${task.title}" executed` };
  }

  private async scheduleNextTask(projectId: string) {
    const job = this.jobs.get(projectId);
    if (!job || !job.isRunning || job.isPaused) return;

    const nextTask = await this.getNextPendingTask(projectId);
    if (!nextTask) {
      // All tasks done
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'COMPLETED', agentState: 'IDLE', currentTaskTitle: null },
      });
      if (job.currentAgentRunId) {
        await prisma.agentRun.update({
          where: { id: job.currentAgentRunId },
          data: { status: 'COMPLETED', endTime: new Date() },
        });
      }
      sseService.sendAgentState(projectId, 'IDLE', 'All tasks completed!');
      this.jobs.delete(projectId);
      return;
    }

    const settings = await prisma.systemSettings.findFirst();
    const delay = settings?.executionSpeedMs ?? 2500;

    job.timer = setTimeout(async () => {
      const currentJob = this.jobs.get(projectId);
      if (!currentJob || !currentJob.isRunning || currentJob.isPaused) return;

      try {
        await agentEngine.executeTask(projectId, nextTask.id);
      } catch (err) {
        console.error(`Task execution failed for ${projectId}:`, err);
      }

      // Schedule next
      this.scheduleNextTask(projectId);
    }, delay);
  }

  private async getNextPendingTask(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        plan: {
          include: {
            days: {
              include: {
                tasks: {
                  where: { status: 'PENDING' },
                  orderBy: [{ day: { dayNumber: 'asc' } }, { order: 'asc' }],
                },
              },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    });

    for (const day of project?.plan?.days ?? []) {
      for (const task of day.tasks) {
        if (task.status === 'PENDING') return task;
      }
    }
    return null;
  }

  isRunning(projectId: string): boolean {
    const job = this.jobs.get(projectId);
    return Boolean(job?.isRunning && !job?.isPaused);
  }
}

export const schedulerService = new SchedulerService();
