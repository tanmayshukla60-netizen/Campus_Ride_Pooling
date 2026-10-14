import { query, withTransaction } from '../db';
import { AppError } from '../middleware/errorHandler';
import { paymentGateway } from './paymentGateway';

export async function bookSeat(
  rideId: string,
  riderId: string,
  seatsBooked: number = 1,
  idempotencyKey?: string
): Promise<any> {
  try {
    const res = await query(
      'SELECT book_seat($1, $2, $3, $4) AS result;',
      [rideId, riderId, seatsBooked, idempotencyKey || null]
    );

    const result = res.rows[0]?.result;
    return result;
  } catch (err: any) {
    if (err.code === '55P03') {
      throw new AppError(
        'Someone just took the last seat! Please try another ride.',
        409,
        'SEATS_UNAVAILABLE'
      );
    }
    if (err.code === '23505') {
      throw new AppError(
        'You already have an active booking on this ride.',
        409,
        'ACTIVE_BOOKING_EXISTS'
      );
    }
    if (err.code === '22000') {
      throw new AppError(
        err.message || 'Cannot book this ride.',
        400,
        'INVALID_BOOKING_REQUEST'
      );
    }
    if (err.code === 'P0002') {
      throw new AppError('Ride not found', 404, 'NOT_FOUND');
    }
    throw err;
  }
}

/**
 * Pay for a PENDING booking hold.
 * Validates hold expiry, charges via mock gateway, logs CHARGE in payments ledger,
 * transitions booking status to CONFIRMED.
 */
export async function payBooking(bookingId: string, riderId: string): Promise<any> {
  return withTransaction(async (client) => {
    // 1. Lock the booking row
    const bookingRes = await client.query(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    const booking = bookingRes.rows[0];

    // Ownership check
    if (booking.rider_id !== riderId) {
      throw new AppError('Unauthorized: Booking belongs to another user', 403, 'FORBIDDEN');
    }

    // Status check
    if (booking.status !== 'PENDING') {
      throw new AppError(
        `Cannot pay for booking in '${booking.status}' status`,
        400,
        'INVALID_BOOKING_STATUS'
      );
    }

    // Check hold expiry
    const now = new Date();
    const expiry = new Date(booking.hold_expires_at);
    if (now > expiry) {
      // Release expired seat hold immediately
      await client.query(
        "UPDATE bookings SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1",
        [bookingId]
      );
      await client.query(
        'UPDATE rides SET seats_available = seats_available + $1, updated_at = NOW() WHERE id = $2',
        [booking.seats_booked, booking.ride_id]
      );
      throw new AppError(
        'Your 5-minute seat hold has expired. Please select a ride and book again.',
        410,
        'HOLD_EXPIRED'
      );
    }

    // 2. Process mock payment gateway charge
    const gatewayRes = await paymentGateway.charge({
      bookingId: booking.id,
      amount: parseFloat(booking.total_price),
    });

    if (!gatewayRes.success) {
      throw new AppError('Payment processing failed', 402, 'PAYMENT_FAILED');
    }

    // 3. Append-only ledger: Insert CHARGE row into payments table
    const paymentRes = await client.query(
      `INSERT INTO payments (booking_id, amount, type, idempotency_key, reason)
       VALUES ($1, $2, 'CHARGE', $3, $4)
       RETURNING id, amount, type, created_at`,
      [
        booking.id,
        booking.total_price,
        gatewayRes.transactionId,
        `Payment for ${booking.seats_booked} seat(s)`,
      ]
    );

    // 4. Update booking to CONFIRMED
    const updatedBookingRes = await client.query(
      `UPDATE bookings 
       SET status = 'CONFIRMED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [booking.id]
    );

    return {
      booking: updatedBookingRes.rows[0],
      payment: paymentRes.rows[0],
      gatewayTransaction: gatewayRes,
    };
  });
}

/**
 * Cancel booking by rider with automatic tiered refund.
 */
export async function cancelBooking(bookingId: string, riderId: string): Promise<any> {
  const res = await query('SELECT cancel_booking($1, $2) AS result;', [bookingId, riderId]);
  return res.rows[0]?.result;
}

/**
 * Driver marks ride completed.
 */
export async function completeRide(rideId: string, driverId: string): Promise<any> {
  const res = await query('SELECT complete_ride($1, $2) AS result;', [rideId, driverId]);
  return res.rows[0]?.result;
}

/**
 * Driver cancels ride with 100% refund in one transaction.
 */
export async function cancelRide(rideId: string, driverId: string): Promise<any> {
  const res = await query('SELECT cancel_ride($1, $2) AS result;', [rideId, driverId]);
  return res.rows[0]?.result;
}

/**
 * Rider rates driver (1-5 + comment) once per booking after completion.
 */
export async function rateDriver(
  bookingId: string,
  riderId: string,
  score: number,
  comment?: string
): Promise<any> {
  // Validate booking
  const bRes = await query(
    `SELECT b.id, b.rider_id, b.status, r.driver_id, r.status AS ride_status
     FROM bookings b
     JOIN rides r ON b.ride_id = r.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bRes.rows.length === 0) {
    throw new AppError('Booking not found', 404, 'NOT_FOUND');
  }

  const booking = bRes.rows[0];

  if (booking.rider_id !== riderId) {
    throw new AppError('Unauthorized: Only the rider can submit a driver rating', 403, 'FORBIDDEN');
  }

  if (booking.status !== 'COMPLETED') {
    throw new AppError(
      'Ratings can only be submitted for COMPLETED bookings (not cancelled or expired)',
      400,
      'BOOKING_NOT_COMPLETED'
    );
  }

  // Check if already rated
  const existingRating = await query('SELECT id FROM ratings WHERE booking_id = $1', [bookingId]);
  if (existingRating.rows.length > 0) {
    throw new AppError('You have already rated this ride', 409, 'ALREADY_RATED');
  }

  // Insert rating (Trigger A will automatically update driver's rating_avg and rating_count)
  const insertRes = await query(
    `INSERT INTO ratings (booking_id, rider_id, driver_id, score, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, booking_id, driver_id, score, comment, created_at`,
    [bookingId, riderId, booking.driver_id, score, comment || null]
  );

  // Fetch updated driver rating
  const driverRes = await query('SELECT rating_avg, rating_count FROM users WHERE id = $1', [booking.driver_id]);

  return {
    rating: insertRes.rows[0],
    driverUpdatedStats: driverRes.rows[0],
  };
}

/**
 * Fetch all bookings for a rider using the v_rider_history view.
 */
export async function getRiderBookings(riderId: string): Promise<any[]> {
  const sql = `
    SELECT *
    FROM v_rider_history
    WHERE rider_id = $1
    ORDER BY booked_at DESC;
  `;
  const res = await query(sql, [riderId]);
  return res.rows;
}
