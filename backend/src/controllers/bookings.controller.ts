import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bookingsService from '../services/bookings.service';
import { AppError } from '../middleware/errorHandler';

const bookSeatSchema = z.object({
  seatsBooked: z.coerce.number().int().min(1, 'Must book at least 1 seat').default(1),
});

const rateDriverSchema = z.object({
  score: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().max(500).optional(),
});

const createBookingSchema = z.object({
  rideId: z.string().uuid('Valid ride ID required'),
  seatsBooked: z.coerce.number().int().min(1).default(1),
  idempotencyKey: z.string().optional(),
});

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role === 'DRIVER') {
      throw new AppError('Drivers are not permitted to book rides. Please sign in as a Rider.', 403, 'FORBIDDEN_ROLE');
    }
    if (req.user?.role === 'ADMIN') {
      throw new AppError('Admins cannot book seats. Please sign in as a Rider.', 403, 'FORBIDDEN_ROLE');
    }
    const validated = createBookingSchema.parse(req.body);
    const idempotencyKey = (req.headers['idempotency-key'] as string) || validated.idempotencyKey || undefined;
    const result = await bookingsService.bookSeat(
      validated.rideId,
      req.user!.userId,
      validated.seatsBooked,
      idempotencyKey
    );
    const statusCode = result.idempotent_replay ? 200 : 201;
    res.status(statusCode).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function bookSeat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role === 'DRIVER') {
      throw new AppError('Drivers are not permitted to book rides. Please sign in as a Rider.', 403, 'FORBIDDEN_ROLE');
    }
    if (req.user?.role === 'ADMIN') {
      throw new AppError('Admins cannot book seats. Please sign in as a Rider.', 403, 'FORBIDDEN_ROLE');
    }
    const rideId = req.params.id as string;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey || undefined;
    const validated = bookSeatSchema.parse(req.body || {});

    const result = await bookingsService.bookSeat(
      rideId,
      req.user!.userId,
      validated.seatsBooked,
      idempotencyKey
    );

    const statusCode = result.idempotent_replay ? 200 : 201;
    res.status(statusCode).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function payBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = req.params.id as string;
    const result = await bookingsService.payBooking(bookingId, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = req.params.id as string;
    const result = await bookingsService.cancelBooking(bookingId, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function rateDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = req.params.id as string;
    const validated = rateDriverSchema.parse(req.body);
    const result = await bookingsService.rateDriver(
      bookingId,
      req.user!.userId,
      validated.score,
      validated.comment
    );
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookings = await bookingsService.getRiderBookings(req.user!.userId);
    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
}
