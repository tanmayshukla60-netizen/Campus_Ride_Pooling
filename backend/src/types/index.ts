export type Role = 'USER' | 'ADMIN' | 'DRIVER' | 'RIDER';
export type RideStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED_BY_RIDER'
  | 'CANCELLED_BY_DRIVER'
  | 'EXPIRED';
export type PaymentType = 'CHARGE' | 'REFUND';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  rating_avg: number;
  rating_count: number;
  created_at: Date;
}

export interface Stop {
  id: number;
  name: string;
  landmark: string | null;
  created_at: Date;
}

export interface Ride {
  id: string;
  driver_id: string;
  driver_name?: string;
  driver_rating_avg?: number;
  driver_rating_count?: number;
  origin_stop_id: number;
  origin_stop_name?: string;
  destination_stop_id: number;
  destination_stop_name?: string;
  departure_time: string | Date;
  total_seats: number;
  seats_available: number;
  price_per_seat: number;
  status: RideStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  ride_id: string;
  rider_id: string;
  seats_booked: number;
  total_price: number;
  status: BookingStatus;
  hold_expires_at: string | Date;
  idempotency_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
