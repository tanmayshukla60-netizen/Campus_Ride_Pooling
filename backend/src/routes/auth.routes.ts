import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authenticateJwt, authController.me);

export default router;
