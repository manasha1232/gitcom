import { Router } from 'express';
import {
  connectGitHub, getGitHubStatus, listRepositories, pushToGitHub, getGitLog,
} from '../controllers/github.controller';

const router = Router();

router.post('/connect', connectGitHub);
router.get('/status', getGitHubStatus);
router.get('/repositories', listRepositories);
router.post('/push', pushToGitHub);
router.get('/log/:projectId', getGitLog);

export default router;
