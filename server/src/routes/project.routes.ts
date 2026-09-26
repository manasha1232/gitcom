import { Router } from 'express';
import {
  createProject, listProjects, getProject, deleteProject,
  generatePlan, getPlan,
  startProject, pauseProject, resumeProject, stopProject, runNextTask,
  getProgress, getCommits, getLogs, getCommitDiff,
} from '../controllers/project.controller';

const router = Router();

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);

router.post('/:id/generate-plan', generatePlan);
router.get('/:id/plan', getPlan);

router.post('/:id/start', startProject);
router.post('/:id/pause', pauseProject);
router.post('/:id/resume', resumeProject);
router.post('/:id/stop', stopProject);
router.post('/:id/run-next', runNextTask);

router.get('/:id/progress', getProgress);
router.get('/:id/commits', getCommits);
router.get('/:id/logs', getLogs);
router.get('/:id/diff/:commitHash', getCommitDiff);

export default router;
