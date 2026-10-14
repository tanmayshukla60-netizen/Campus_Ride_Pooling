import { query } from '../db';
import { Ride, Stop } from '../types';
import { AppError } from '../middleware/errorHandler';

export async function createRide(
  driverId: string,
  originStopId: number,
  destinationStopId: number,
  departureTime: string,
  totalSeats: number,
  pricePerSeat: number
): Promise<Ride> {
  // Validate origin != destination
  if (originStopId === destinationStopId) {
    throw new AppError('Origin and destination stops must be different', 400, 'INVALID_STOPS');
  }

  // Validate departure time in future
  const depTime = new Date(departureTime);
  if (isNaN(depTime.getTime()) || depTime <= new Date()) {
    throw new AppError('Departure time must be a valid future timestamp', 400, 'INVALID_DEPARTURE_TIME');
  }

  // Verify stops exist
  const stopsRes = await query('SELECT id FROM stops WHERE id IN ($1, $2)', [originStopId, destinationStopId]);
  if (stopsRes.rows.length < 2) {
    throw new AppError('One or both specified stops do not exist', 404, 'STOP_NOT_FOUND');
  }

  // Insert ride using 100% parameterized raw SQL
  const insertRes = await query<Ride>(
    `INSERT INTO rides (
      driver_id,
      origin_stop_id,
      destination_stop_id,
      departure_time,
      total_seats,
      seats_available,
      price_per_seat,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $5, $6, 'SCHEDULED')
    RETURNING *`,
    [driverId, originStopId, destinationStopId, depTime.toISOString(), totalSeats, pricePerSeat]
  );

  return insertRes.rows[0];
}

export interface SearchRidesParams {
  originStopId?: number;
  destinationStopId?: number;
  departureTime?: string;
  seatsNeeded?: number;
}

export async function searchRides(params: SearchRidesParams): Promise<any[]> {
  const { originStopId, destinationStopId, departureTime, seatsNeeded = 1 } = params;

  const hasSpecificRoute = Boolean(originStopId && destinationStopId && originStopId > 0 && destinationStopId > 0);

  if (hasSpecificRoute && originStopId === destinationStopId) {
    throw new AppError('Origin and destination stops must be different', 400, 'INVALID_STOPS');
  }

  let timeAnchor: Date;
  let hasAnchor = false;
  if (departureTime) {
    timeAnchor = new Date(departureTime);
    if (!isNaN(timeAnchor.getTime())) {
      hasAnchor = true;
    } else {
      timeAnchor = new Date();
    }
  } else {
    timeAnchor = new Date();
  }

  const conditions: string[] = ["r.status = 'SCHEDULED'", 'r.departure_time > NOW()'];
  const sqlParams: any[] = [];

  // Stop filtering
  if (hasSpecificRoute) {
    sqlParams.push(originStopId);
    conditions.push(`r.origin_stop_id = $${sqlParams.length}`);
    sqlParams.push(destinationStopId);
    conditions.push(`r.destination_stop_id = $${sqlParams.length}`);
  } else if (originStopId && originStopId > 0) {
    sqlParams.push(originStopId);
    conditions.push(`r.origin_stop_id = $${sqlParams.length}`);
  } else if (destinationStopId && destinationStopId > 0) {
    sqlParams.push(destinationStopId);
    conditions.push(`r.destination_stop_id = $${sqlParams.length}`);
  }

  // Seats filtering
  sqlParams.push(seatsNeeded);
  conditions.push(`r.seats_available >= $${sqlParams.length}`);

  // Time filtering if specific departure time provided
  let timeRefPlaceholder = 'NOW()';
  if (hasAnchor) {
    sqlParams.push(timeAnchor.toISOString());
    const timeIdx = sqlParams.length;
    timeRefPlaceholder = `$${timeIdx}::timestamptz`;
    conditions.push(`r.departure_time >= ($${timeIdx}::timestamptz - INTERVAL '30 minutes')`);
    conditions.push(`r.departure_time <= ($${timeIdx}::timestamptz + INTERVAL '30 minutes')`);
  }

  const sql = `
    SELECT 
      r.id,
      r.driver_id,
      u.full_name AS driver_name,
      u.email AS driver_email,
      u.rating_avg AS driver_rating_avg,
      u.rating_count AS driver_rating_count,
      r.origin_stop_id,
      so.name AS origin_stop_name,
      so.landmark AS origin_landmark,
      r.destination_stop_id,
      sd.name AS destination_stop_name,
      sd.landmark AS destination_landmark,
      r.departure_time,
      r.total_seats,
      r.seats_available,
      r.price_per_seat,
      r.status,
      ROUND(
        (ABS(EXTRACT(EPOCH FROM (r.departure_time - ${timeRefPlaceholder}))) / 60.0 * 0.4) +
        (r.price_per_seat * 0.4) -
        (u.rating_avg * 15.0),
        2
      ) AS rank_score
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    JOIN stops so ON r.origin_stop_id = so.id
    JOIN stops sd ON r.destination_stop_id = sd.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY rank_score ASC, r.departure_time ASC;
  `;

  const res = await query(sql, sqlParams);
  return res.rows;
}

export async function getRideById(rideId: string): Promise<any> {
  const sql = `
    SELECT 
      r.id,
      r.driver_id,
      u.full_name AS driver_name,
      u.email AS driver_email,
      u.rating_avg AS driver_rating_avg,
      u.rating_count AS driver_rating_count,
      r.origin_stop_id,
      so.name AS origin_stop_name,
      so.landmark AS origin_landmark,
      r.destination_stop_id,
      sd.name AS destination_stop_name,
      sd.landmark AS destination_landmark,
      r.departure_time,
      r.total_seats,
      r.seats_available,
      r.price_per_seat,
      r.status,
      r.created_at,
      r.updated_at
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    JOIN stops so ON r.origin_stop_id = so.id
    JOIN stops sd ON r.destination_stop_id = sd.id
    WHERE r.id = $1;
  `;

  const res = await query(sql, [rideId]);
  if (res.rows.length === 0) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }

  return res.rows[0];
}

export async function getAllStops(): Promise<Stop[]> {
  const res = await query<Stop>('SELECT id, name, landmark, created_at FROM stops ORDER BY id ASC');
  return res.rows;
}

export async function getDriverRides(driverId: string): Promise<any[]> {
  const sql = `
    SELECT 
      r.id,
      r.driver_id,
      r.origin_stop_id,
      so.name AS origin_stop_name,
      r.destination_stop_id,
      sd.name AS destination_stop_name,
      r.departure_time,
      r.total_seats,
      r.seats_available,
      r.price_per_seat,
      r.status,
      r.created_at,
      r.updated_at,
      COUNT(b.id) FILTER (WHERE b.status IN ('PENDING', 'CONFIRMED', 'COMPLETED')) AS active_bookings_count
    FROM rides r
    JOIN stops so ON r.origin_stop_id = so.id
    JOIN stops sd ON r.destination_stop_id = sd.id
    LEFT JOIN bookings b ON b.ride_id = r.id
    WHERE r.driver_id = $1
    GROUP BY r.id, so.name, sd.name
    ORDER BY r.departure_time DESC;
  `;
  const res = await query(sql, [driverId]);
  return res.rows;
}
