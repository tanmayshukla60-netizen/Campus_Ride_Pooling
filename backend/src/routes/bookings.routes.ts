import { Router } from 'express';
import * as bookingsController from '../controllers/bookings.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/mine', bookingsController.getMyBookings);
router.post('/', bookingsController.createBooking);
router.post('/:id/pay', bookingsController.payBooking);
router.post('/:id/cancel', bookingsController.cancelBooking);
router.post('/:id/rate', bookingsController.rateDriver);

export default router;
