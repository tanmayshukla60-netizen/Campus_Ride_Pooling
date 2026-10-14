import { Router } from 'express';
import * as ridesController from '../controllers/rides.controller';
import * as bookingsController from '../controllers/bookings.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/search', ridesController.searchRides);
router.get('/:id', ridesController.getRide);

// Protected routes (Requires Auth)
router.post('/', authenticateJwt, ridesController.createRide);
router.get('/mine/posted', authenticateJwt, ridesController.getDriverRides);
router.post('/:id/book', authenticateJwt, bookingsController.bookSeat);
router.post('/:id/cancel', authenticateJwt, ridesController.cancelRide);
router.post('/:id/complete', authenticateJwt, ridesController.completeRide);

export default router;
