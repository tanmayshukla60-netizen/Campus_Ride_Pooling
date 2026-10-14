import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as ridesService from '../services/rides.service';
import * as bookingsService from '../services/bookings.service';
import { AppError } from '../middleware/errorHandler';

const createRideSchema = z.object({
  originStopId: z.number().int().positive('Origin stop ID is required'),
  destinationStopId: z.number().int().positive('Destination stop ID is required'),
  departureTime: z.string().datetime({ message: 'Valid ISO departure time string required' }),
  totalSeats: z.number().int().min(1, 'At least 1 seat is required').max(10, 'Maximum 10 seats'),
  pricePerSeat: z.number().nonnegative('Price per seat must be >= 0'),
});

const searchRidesSchema = z.object({
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
  time: z.string().optional(),
  seats: z.coerce.number().int().min(1).default(1),
});

export async function createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role === 'RIDER') {
      throw new AppError('Riders are not permitted to publish rides. Please sign in as a Driver.', 403, 'FORBIDDEN_ROLE');
    }
    const validated = createRideSchema.parse(req.body);
    const ride = await ridesService.createRide(
      req.user!.userId,
      validated.originStopId,
      validated.destinationStopId,
      validated.departureTime,
      validated.totalSeats,
      validated.pricePerSeat
    );
    res.status(201).json({
      success: true,
      data: ride,
    });
  } catch (err) {
    next(err);
  }
}

export async function searchRides(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = searchRidesSchema.parse(req.query);
    const rides = await ridesService.searchRides({
      originStopId: validated.from,
      destinationStopId: validated.to,
      departureTime: validated.time,
      seatsNeeded: validated.seats,
    });
    res.status(200).json({
      success: true,
      data: rides,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rideId = req.params.id as string;
    const ride = await ridesService.getRideById(rideId);
    res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDriverRides(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rides = await ridesService.getDriverRides(req.user!.userId);
    res.status(200).json({
      success: true,
      data: rides,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllStops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stops = await ridesService.getAllStops();
    res.status(200).json({
      success: true,
      data: stops,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rideId = req.params.id as string;
    const result = await bookingsService.cancelRide(rideId, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rideId = req.params.id as string;
    const result = await bookingsService.completeRide(rideId, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
