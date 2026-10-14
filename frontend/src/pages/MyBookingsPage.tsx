import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { CancellationModal } from '../components/CancellationModal';
import { RatingModal } from '../components/RatingModal';
import { BookingModal } from '../components/BookingModal';
import {
  BookmarkCheck, Clock, ArrowRight, ShieldCheck, Star,
  RefreshCw, CreditCard, RotateCcw, Route, Timer, CheckCircle2,
  XCircle, AlertCircle,
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [cancellingBooking, setCancellingBooking] = useState<any | null>(null);
  const [ratingBooking, setRatingBooking] = useState<any | null>(null);
  const [payingBooking, setPayingBooking] = useState<any | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/bookings/mine');
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-amber animate-urgent"><Timer className="w-3 h-3" />Hold Pending</span>;
      case 'CONFIRMED':
        return <span className="badge badge-emerald"><ShieldCheck className="w-3 h-3" />Confirmed</span>;
      case 'COMPLETED':
        return <span className="badge badge-indigo"><CheckCircle2 className="w-3 h-3" />Completed</span>;
      case 'CANCELLED_BY_RIDER':
        return <span className="badge badge-slate"><XCircle className="w-3 h-3" />Cancelled by You</span>;
      case 'CANCELLED_BY_DRIVER':
        return <span className="badge badge-rose"><AlertCircle className="w-3 h-3" />Driver Cancelled</span>;
      case 'EXPIRED':
        return <span className="badge badge-slate"><Clock className="w-3 h-3" />Hold Expired</span>;
      default:
        return <span className="badge badge-slate">{status}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">My Bookings</h1>
          <p className="text-sm text-white/35 mt-1">Active holds, confirmed rides, cancellation refunds & ratings.</p>
        </div>
        <button
          onClick={fetchBookings}
          className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-16 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white/40">Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-3">
          <BookmarkCheck className="w-14 h-14 text-white/10 mx-auto" />
          <h3 className="font-heading font-bold text-xl text-white/60">No Bookings Yet</h3>
          <p className="text-sm text-white/30 max-w-sm mx-auto">
            Head to "Find Rides" and book your first trip.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b, i) => {
            const canCancel = b.booking_status === 'CONFIRMED' || b.booking_status === 'PENDING';
            const isCompleted = b.booking_status === 'COMPLETED';
            const hasRated = !!b.rating_id;
            const isPending = b.booking_status === 'PENDING';

            return (
              <div
                key={b.booking_id}
                className="glass-card p-5 sm:p-6 space-y-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Top row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-lg text-white/90">{b.origin_stop_name}</span>
                    <div className="flex items-center gap-1 text-indigo-400/40">
                      <div className="w-6 h-[1px] bg-indigo-400/20" />
                      <Route className="w-3.5 h-3.5" />
                      <div className="w-6 h-[1px] bg-indigo-400/20" />
                    </div>
                    <span className="font-heading font-bold text-lg text-white/90">{b.destination_stop_name}</span>
                  </div>
                  {getStatusBadge(b.booking_status)}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-white/[0.05] text-xs">
                  <div>
                    <span className="text-white/30 block mb-0.5">Departure</span>
                    <span className="font-bold text-white/70">
                      {new Date(b.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/30 block mb-0.5">Driver</span>
                    <span className="font-bold text-white/70 flex items-center gap-1.5">
                      {b.driver_name}
                      <span className="text-amber-400 font-semibold">★ {Number(b.driver_rating_avg).toFixed(1)}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-white/30 block mb-0.5">Seats</span>
                    <span className="font-bold text-white/70">{b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''}</span>
                  </div>
                  <div>
                    <span className="text-white/30 block mb-0.5">Total Price</span>
                    <span className="font-heading font-bold text-sm text-white">₹{Number(b.total_price).toFixed(2)}</span>
                  </div>
                </div>

                {/* Refund info */}
                {Number(b.total_refunded) > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-xs flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>Refund of ₹{Number(b.total_refunded).toFixed(2)} recorded to ledger.</span>
                  </div>
                )}

                {/* Existing rating */}
                {hasRated && (
                  <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>You rated this driver {b.rating_score} / 5</span>
                    </div>
                    {b.rating_comment && (
                      <p className="text-white/40 italic">"{b.rating_comment}"</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  {isPending && (
                    <button
                      onClick={() => setPayingBooking({
                        id: b.ride_id,
                        origin_stop_name: b.origin_stop_name,
                        destination_stop_name: b.destination_stop_name,
                        departure_time: b.departure_time,
                        driver_name: b.driver_name,
                        driver_rating_avg: b.driver_rating_avg,
                        price_per_seat: b.price_per_seat,
                        seats_available: 1,
                      })}
                      className="btn-glow px-4 py-2.5 text-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Now</span>
                    </button>
                  )}

                  {canCancel && (
                    <button
                      id={`btn-cancel-booking-${b.booking_id}`}
                      onClick={() => setCancellingBooking(b)}
                      className="btn-ghost px-4 py-2.5 text-xs hover:border-rose-500/50 hover:text-rose-400"
                    >
                      Cancel Booking
                    </button>
                  )}

                  {isCompleted && !hasRated && (
                    <button
                      id={`btn-rate-driver-${b.booking_id}`}
                      onClick={() => setRatingBooking(b)}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/15 hover:shadow-amber-500/25 transition-all flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Rate Driver</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancellingBooking && (
        <CancellationModal
          booking={cancellingBooking}
          isOpen={!!cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onCancelled={fetchBookings}
        />
      )}

      {ratingBooking && (
        <RatingModal
          booking={ratingBooking}
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          onRated={fetchBookings}
        />
      )}

      {payingBooking && (
        <BookingModal
          ride={payingBooking}
          isOpen={!!payingBooking}
          onClose={() => setPayingBooking(null)}
          onBookingConfirmed={fetchBookings}
        />
      )}
    </div>
  );
};
