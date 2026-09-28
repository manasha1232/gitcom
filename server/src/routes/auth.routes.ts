import { Router } from 'express';
import { loginWithToken, getMe, getPreconfiguredUsers } from '../controllers/auth.controller';

const router = Router();

router.post('/login-with-token', loginWithToken);
router.get('/me', getMe);
router.get('/preconfigured-users', getPreconfiguredUsers);

export default router;
