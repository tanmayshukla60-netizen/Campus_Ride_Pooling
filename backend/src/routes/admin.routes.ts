import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateJwt, requireAdmin } from '../middleware/auth';

const router = Router();

// Protect all admin endpoints with JWT authentication AND Admin role check
router.use(authenticateJwt, requireAdmin);

router.get('/overview', adminController.getAdminOverview);

export default router;
