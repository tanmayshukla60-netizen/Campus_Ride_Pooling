import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // PostgreSQL Specific Error Codes
  if (err.code) {
    // 23505: unique_violation
    if (err.code === '23505') {
      const msg = err.detail || 'A record with this information already exists';
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT_ERROR',
          message: msg.includes('uq_active_rider_ride')
            ? 'You already have an active booking on this ride'
            : msg,
        },
      });
      return;
    }

    // 55P03: lock_not_available or our custom seats exception
    if (err.code === '55P03') {
      res.status(409).json({
        success: false,
        error: {
          code: 'SEATS_UNAVAILABLE',
          message: err.message || 'Someone just took the last seat! Please try another ride.',
        },
      });
      return;
    }

    // 22000: data_exception (e.g., illegal state transitions, business rule violations)
    if (err.code === '22000') {
      res.status(400).json({
        success: false,
        error: {
          code: 'ILLEGAL_STATE_TRANSITION',
          message: err.message || 'State transition rejected by database state machine',
        },
      });
      return;
    }

    // P0002: no_data_found
    if (err.code === 'P0002') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: err.message || 'Resource not found',
        },
      });
      return;
    }

    // 42501: insufficient_privilege
    if (err.code === '42501') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: err.message || 'Unauthorized action on resource',
        },
      });
      return;
    }
  }

  // Generic internal server error
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
