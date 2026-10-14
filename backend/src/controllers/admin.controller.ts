import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

export async function getAdminOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [usersRes, ridesRes, bookingsRes, auditRes, paymentsRes] = await Promise.all([
      query(
        `SELECT id, full_name, email, role, rating_avg, rating_count, created_at
         FROM users 
         ORDER BY created_at DESC;`
      ),
      query(
        `SELECT 
           r.id, r.driver_id, u.full_name AS driver_name, u.email AS driver_email,
           r.origin_stop_id, so.name AS origin_stop_name,
           r.destination_stop_id, sd.name AS destination_stop_name,
           r.departure_time, r.total_seats, r.seats_available, r.price_per_seat,
           r.status, r.created_at, r.updated_at
         FROM rides r
         JOIN users u ON r.driver_id = u.id
         JOIN stops so ON r.origin_stop_id = so.id
         JOIN stops sd ON r.destination_stop_id = sd.id
         ORDER BY r.departure_time DESC;`
      ),
      query(
        `SELECT 
           b.id, b.ride_id, b.rider_id, u.full_name AS rider_name, u.email AS rider_email,
           b.seats_booked, b.total_price, b.status, b.hold_expires_at,
           b.idempotency_key, b.created_at, b.updated_at,
           so.name AS origin_stop_name, sd.name AS destination_stop_name,
           r.departure_time
         FROM bookings b
         JOIN users u ON b.rider_id = u.id
         JOIN rides r ON b.ride_id = r.id
         JOIN stops so ON r.origin_stop_id = so.id
         JOIN stops sd ON r.destination_stop_id = sd.id
         ORDER BY b.created_at DESC;`
      ),
      query(
        `SELECT 
           a.id, a.entity_type, a.entity_id, a.action,
           a.old_state, a.new_state, a.changed_by,
           u.full_name AS changed_by_name,
           a.created_at
         FROM audit_log a
         LEFT JOIN users u ON a.changed_by = u.id
         ORDER BY a.created_at DESC
         LIMIT 100;`
      ),
      query(
        `SELECT 
           p.id, p.booking_id, p.amount, p.type,
           p.idempotency_key, p.reason, p.created_at
         FROM payments p
         ORDER BY p.created_at DESC
         LIMIT 100;`
      ),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: usersRes.rows,
        rides: ridesRes.rows,
        bookings: bookingsRes.rows,
        auditLog: auditRes.rows,
        payments: paymentsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}
