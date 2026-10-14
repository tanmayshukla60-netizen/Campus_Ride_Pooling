import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import {
  Car, PlusCircle, MapPin, Calendar, Users, Clock,
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
  RefreshCw, Route, DollarSign, Zap,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface Stop {
  id: number;
  name: string;
  landmark: string | null;
}

interface DriverPageProps {
  onSwitchToRider?: () => void;
}

export const DriverPage: React.FC<DriverPageProps> = ({ onSwitchToRider }) => {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [originStopId, setOriginStopId] = useState<number>(1);
  const [destinationStopId, setDestinationStopId] = useState<number>(2);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [totalSeats, setTotalSeats] = useState<number>(3);
  const [pricePerSeat, setPricePerSeat] = useState<number>(150);

  const [postedRides, setPostedRides] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [posting, setPosting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancellingRideId, setCancellingRideId] = useState<string | null>(null);

  const fetchDriverData = async () => {
    setLoading(true);
    try {
      const [stopsData, ridesData] = await Promise.all([
        apiRequest<Stop[]>('/stops'),
        apiRequest<any[]>('/rides/mine/posted'),
      ]);
      setStops(stopsData);
      setPostedRides(ridesData);
      if (stopsData.length >= 2) {
        setOriginStopId(stopsData[0].id);
        setDestinationStopId(stopsData[1].id);
      }
    } catch (err) {
      console.error('Failed to load driver data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    const defaultDate = new Date(Date.now() + 3 * 3600 * 1000);
    defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
    setDepartureTime(defaultDate.toISOString().slice(0, 16));
  }, []);

  const handlePostRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setMessage(null);
    try {
      await apiRequest('/rides', {
        method: 'POST',
        body: JSON.stringify({
          originStopId,
          destinationStopId,
          departureTime: new Date(departureTime).toISOString(),
          totalSeats,
          pricePerSeat,
        }),
      });
      const fromName = stops.find((s) => s.id === originStopId)?.name || 'Origin';
      const toName = stops.find((s) => s.id === destinationStopId)?.name || 'Destination';
      setMessage({
        type: 'success',
        text: `Ride published: ${fromName} → ${toName} (${totalSeats} seats @ ₹${pricePerSeat}/seat)!`,
      });
      const updatedRides = await apiRequest<any[]>('/rides/mine/posted');
      setPostedRides(updatedRides);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to post ride' });
    } finally {
      setPosting(false);
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    try {
      await apiRequest(`/rides/${rideId}/complete`, { method: 'POST' });
      fetchDriverData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    try {
      const res = await apiRequest<any>(`/rides/${rideId}/cancel`, { method: 'POST' });
      setMessage({ type: 'success', text: `Ride cancelled. ${res.cancelled_bookings_count} bookings refunded 100%.` });
      setCancellingRideId(null);
      fetchDriverData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="font-heading text-3xl font-extrabold text-white">Driver Hub</h1>
        <p className="text-sm text-white/35 mt-1">Post rides, set custom seat fares, complete trips, and track your itinerary.</p>
      </div>

      {/* Status messages */}
      {message && (
        <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-semibold animate-float-in shadow-xl ${
          message.type === 'success'
            ? 'bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/15 border-2 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            <div>
              <div className="text-white font-bold">{message.text}</div>
              {message.type === 'success' && (
                <div className="text-xs text-emerald-400/80 mt-0.5">
                  Saved into PostgreSQL database using raw SQL INSERT with row triggers.
                </div>
              )}
            </div>
          </div>

          {message.type === 'success' && onSwitchToRider && (
            <button
              onClick={() => onSwitchToRider()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
            >
              <span>Sign In as Rider to Book This Ride</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Post a Ride */}
      <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">Post a New Ride</h2>
            <p className="text-xs text-white/35">Create a cab share itinerary for other students</p>
          </div>
        </div>

        <form onSubmit={handlePostRide} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Pickup
              </label>
              <select
                id="post-origin-stop"
                value={originStopId}
                onChange={(e) => setOriginStopId(Number(e.target.value))}
                className="input-dark w-full cursor-pointer"
              >
                {stops.map((s) => <option key={s.id} value={s.id} disabled={s.id === destinationStopId}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Destination
              </label>
              <select
                id="post-destination-stop"
                value={destinationStopId}
                onChange={(e) => setDestinationStopId(Number(e.target.value))}
                className="input-dark w-full cursor-pointer"
              >
                {stops.map((s) => <option key={s.id} value={s.id} disabled={s.id === originStopId}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Departure
              </label>
              <input
                id="post-departure-time"
                type="datetime-local"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="input-dark w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> Total Seats
              </label>
              <select
                id="post-total-seats"
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="input-dark w-full cursor-pointer"
              >
                {[1,2,3,4,6].map(n => <option key={n} value={n}>{n} Seat{n > 1 ? 's' : ''}{n === 6 ? ' (Van)' : ''}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Price / Seat (₹)
              </label>
              <input
                id="post-price-per-seat"
                type="number"
                min="0"
                step="10"
                required
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(Number(e.target.value))}
                className="input-dark w-full"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="btn-publish-ride"
              type="submit"
              disabled={posting || originStopId === destinationStopId}
              className="btn-glow w-full sm:w-auto px-8 py-3.5 text-sm flex items-center justify-center gap-2"
            >
              {posting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Publish Ride</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Posted Rides */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-xl text-white/80">My Posted Rides</h2>

        {loading ? (
          <div className="glass-card p-12 text-center">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-white/40">Loading rides...</p>
          </div>
        ) : postedRides.length === 0 ? (
          <div className="glass-card p-12 text-center text-white/30 text-sm">
            You haven't posted any rides yet.
          </div>
        ) : (
          postedRides.map((ride, i) => {
            const isScheduled = ride.status === 'SCHEDULED';
            return (
              <div
                key={ride.id}
                className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-bold text-base text-white/90">{ride.origin_stop_name}</span>
                    <div className="flex items-center gap-1 text-indigo-400/40">
                      <div className="w-5 h-[1px] bg-indigo-400/20" />
                      <Route className="w-3.5 h-3.5" />
                      <div className="w-5 h-[1px] bg-indigo-400/20" />
                    </div>
                    <span className="font-heading font-bold text-base text-white/90">{ride.destination_stop_name}</span>
                    <span className={`badge text-[10px] ${
                      ride.status === 'SCHEDULED' ? 'badge-emerald' :
                      ride.status === 'COMPLETED' ? 'badge-indigo' : 'badge-slate'
                    }`}>
                      {ride.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {new Date(ride.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="font-bold text-white/60">{ride.seats_available} / {ride.total_seats} seats free</span>
                    <span className="text-white/15">·</span>
                    <span className="font-bold text-white/60">₹{Number(ride.price_per_seat).toFixed(0)}/seat</span>
                  </div>
                </div>

                {isScheduled && (
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-complete-ride-${ride.id}`}
                      onClick={() => handleCompleteRide(ride.id)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                    <button
                      id={`btn-cancel-ride-${ride.id}`}
                      onClick={() => setCancellingRideId(ride.id)}
                      className="btn-ghost px-4 py-2.5 text-xs hover:border-rose-500/50 hover:text-rose-400 flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cancel Ride Confirmation */}
      {cancellingRideId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={() => setCancellingRideId(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-md modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="glass-card-static p-7 shadow-2xl border-white/[0.08] space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/15 border-2 border-rose-500/25 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-white">Cancel Entire Ride?</h3>
                  <p className="text-xs text-white/40">This will refund all active bookings 100%.</p>
                </div>
              </div>

              <p className="text-xs text-white/35 leading-relaxed">
                All rider bookings will be cancelled and <strong className="text-white/60">100% refunds</strong> issued to the payment ledger atomically in one database transaction.
              </p>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setCancellingRideId(null)} className="btn-ghost flex-1 py-3 text-sm">
                  Keep Active
                </button>
                <button
                  onClick={() => handleCancelRide(cancellingRideId)}
                  className="flex-1 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/20 transition-all"
                >
                  Yes, Cancel & Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
