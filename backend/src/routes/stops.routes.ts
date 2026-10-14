import { Router } from 'express';
import * as ridesController from '../controllers/rides.controller';

const router = Router();

router.get('/', ridesController.getAllStops);

export default router;
