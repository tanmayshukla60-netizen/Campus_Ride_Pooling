import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BookingModal } from '../components/BookingModal';
import {
  Search, MapPin, Calendar, Users, Car, Star, Clock,
  ArrowRight, Sparkles, RefreshCw, Route, Zap, Compass,
} from 'lucide-react';

interface Stop {
  id: number;
  name: string;
  landmark: string | null;
}

interface RideItem {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_email: string;
  driver_rating_avg: number;
  driver_rating_count: number;
  origin_stop_id: number;
  origin_stop_name: string;
  destination_stop_id: number;
  destination_stop_name: string;
  departure_time: string;
  total_seats: number;
  seats_available: number;
  price_per_seat: number;
  status: string;
  rank_score?: number;
}

export const FindRidesPage: React.FC<{ onRequireAuth: () => void }> = ({ onRequireAuth }) => {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [fromStop, setFromStop] = useState<number>(0);
  const [toStop, setToStop] = useState<number>(0);
  const [whenTime, setWhenTime] = useState<string>('');
  const [seatsNeeded, setSeatsNeeded] = useState<number>(1);

  const [rides, setRides] = useState<RideItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [searchSummary, setSearchSummary] = useState<string>('');
  const [selectedRide, setSelectedRide] = useState<RideItem | null>(null);

  useEffect(() => {
    async function loadStops() {
      try {
        const data = await apiRequest<Stop[]>('/stops');
        setStops(data);
      } catch (err) {
        console.error('Failed to load stops:', err);
      }
    }
    loadStops();
    // Initially load all upcoming campus rides
    executeSearch(0, 0, '', 1);
  }, []);

  const executeSearch = async (fromId: number, toId: number, timeStr: string, seats: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromId > 0) params.append('from', fromId.toString());
      if (toId > 0) params.append('to', toId.toString());
      if (seats > 1) params.append('seats', seats.toString());
      if (timeStr) params.append('time', timeStr);

      const qs = params.toString();
      const endpoint = qs ? `/rides/search?${qs}` : '/rides/search';
      const res = await apiRequest<RideItem[]>(endpoint);
      setRides(res);
      setSearched(true);

      if (fromId > 0 && toId > 0) {
        const fromObj = stops.find((s) => s.id === fromId);
        const toObj = stops.find((s) => s.id === toId);
        setSearchSummary(`${res.length} ride${res.length === 1 ? '' : 's'} · ${fromObj?.name || 'Origin'} → ${toObj?.name || 'Destination'}`);
      } else {
        setSearchSummary(`${res.length} upcoming ride${res.length === 1 ? '' : 's'} across campus`);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(fromStop, toStop, whenTime, seatsNeeded);
  };

  const handleQuickRoute = (fromId: number, toId: number) => {
    setFromStop(fromId);
    setToStop(toId);
    setWhenTime('');
    executeSearch(fromId, toId, '', seatsNeeded);
  };

  const handleBookClick = (ride: RideItem) => {
    if (!user) { onRequireAuth(); return; }
    setSelectedRide(ride);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-2xl mx-auto animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
          <Zap className="w-3.5 h-3.5" />
          <span>PostgreSQL Row-Level Locking · Concurrency Safe</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="gradient-text">Find Your Campus Ride</span>
        </h1>
        <p className="text-white/40 text-sm sm:text-base max-w-lg mx-auto">
          Instant seat reservations with 5-minute pessimistic hold guarantees. Split fares securely with verified students.
        </p>
      </div>

      {/* Quick Route Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-in-up stagger-1">
        <button
          onClick={() => handleQuickRoute(0, 0)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${fromStop === 0 && toStop === 0
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white'
            }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>All Campus Rides</span>
        </button>

        <button
          onClick={() => handleQuickRoute(1, 2)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${fromStop === 1 && toStop === 2
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white'
            }`}
        >
          <span>🚗 Main Gate → Katpadi</span>
        </button>

        <button
          onClick={() => handleQuickRoute(1, 3)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${fromStop === 1 && toStop === 3
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white'
            }`}
        >
          <span>✈️ Main Gate → Chennai Airport</span>
        </button>

        <button
          onClick={() => handleQuickRoute(1, 4)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${fromStop === 1 && toStop === 4
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white'
            }`}
        >
          <span>🏢 Main Gate → Bangalore</span>
        </button>
      </div>

      {/* Search Card */}
      <div className="glass-card p-6 sm:p-8 animate-fade-in-up stagger-2">
        <form onSubmit={handleSearchSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* FROM */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                From
              </label>
              <select
                id="search-from-stop"
                value={fromStop}
                onChange={(e) => setFromStop(Number(e.target.value))}
                className="input-dark w-full cursor-pointer"
              >
                <option value={0}>All Campus Stops (Browse All)</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id} disabled={toStop > 0 && s.id === toStop}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* TO */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                To
              </label>
              <select
                id="search-to-stop"
                value={toStop}
                onChange={(e) => setToStop(Number(e.target.value))}
                className="input-dark w-full cursor-pointer"
              >
                <option value={0}>All Destinations (Browse All)</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id} disabled={fromStop > 0 && s.id === fromStop}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* WHEN */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                When (±30m)
              </label>
              <input
                id="search-when-time"
                type="datetime-local"
                value={whenTime}
                onChange={(e) => setWhenTime(e.target.value)}
                className="input-dark w-full"
              />
            </div>

            {/* SEATS */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Seats
              </label>
              <select
                id="search-seats-needed"
                value={seatsNeeded}
                onChange={(e) => setSeatsNeeded(Number(e.target.value))}
                className="input-dark w-full cursor-pointer"
              >
                <option value={1}>1 Seat</option>
                <option value={2}>2 Seats</option>
                <option value={3}>3 Seats</option>
                <option value={4}>4 Seats</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="btn-search-rides"
              type="submit"
              disabled={loading || (fromStop > 0 && toStop > 0 && fromStop === toStop)}
              className="btn-glow w-full sm:w-auto px-8 py-3.5 text-sm flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Search Rides'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results header */}
      {searched && (
        <div className="flex items-center justify-between px-1 animate-fade-in-up">
          <div className="font-heading text-lg font-bold text-white/80">{searchSummary}</div>
          <button
            onClick={() => executeSearch(fromStop, toStop, whenTime, seatsNeeded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* Ride Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-16 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-white/50">Querying rides with composite index...</p>
          </div>
        ) : rides.length === 0 && searched ? (
          <div className="glass-card p-14 text-center space-y-4">
            <Car className="w-14 h-14 text-white/10 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-xl text-white/80">No Rides Found For This Route</h3>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                No scheduled rides match the selected filters right now.
              </p>
            </div>
            <button
              onClick={() => handleQuickRoute(0, 0)}
              className="btn-glow px-6 py-2.5 text-xs inline-flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Show All Available Campus Rides</span>
            </button>
          </div>
        ) : (
          rides.map((ride, i) => {
            const isFull = ride.seats_available <= 0;
            const isLow = ride.seats_available === 1;

            return (
              <div
                key={ride.id}
                id={`ride-card-${ride.id}`}
                className={`glass-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fade-in-up`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Left: route info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-bold text-lg text-white/90">{ride.origin_stop_name}</span>
                    <div className="flex items-center gap-1 text-indigo-400/50">
                      <div className="w-8 h-[1px] bg-indigo-400/30" />
                      <Route className="w-4 h-4" />
                      <div className="w-8 h-[1px] bg-indigo-400/30" />
                    </div>
                    <span className="font-heading font-bold text-lg text-white/90">{ride.destination_stop_name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/60 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {new Date(ride.departure_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' at '}
                      {new Date(ride.departure_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <span className="flex items-center gap-1.5 text-white/50 font-semibold">
                      {ride.driver_name}
                      <span className="badge badge-amber text-[10px] py-0">
                        <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                        {Number(ride.driver_rating_avg).toFixed(1)}
                        <span className="text-amber-400/50">({ride.driver_rating_count})</span>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Right: price, seats, book */}
                <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-white/[0.06] pt-4 md:pt-0">
                  <div className="text-left md:text-right space-y-1.5">
                    <div className="font-heading text-2xl font-extrabold text-white">
                      ₹{Number(ride.price_per_seat).toFixed(0)}
                      <span className="text-xs font-normal text-white/30 ml-1">/ seat</span>
                    </div>
                    <div>
                      {isFull ? (
                        <span className="badge badge-slate">Full</span>
                      ) : isLow ? (
                        <span className="badge badge-amber animate-urgent">1 seat left</span>
                      ) : (
                        <span className="badge badge-emerald">{ride.seats_available} seats left</span>
                      )}
                    </div>
                  </div>

                  {user?.role === 'DRIVER' ? (
                    <button
                      disabled
                      className="px-4 py-3 rounded-xl font-bold text-xs bg-white/[0.04] text-white/30 border border-white/[0.08] cursor-not-allowed"
                      title="Drivers cannot book rides"
                    >
                      Drivers Cannot Book
                    </button>
                  ) : (
                    <button
                      id={`btn-book-ride-${ride.id}`}
                      onClick={() => handleBookClick(ride)}
                      disabled={isFull}
                      className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${isFull
                          ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                          : 'btn-coral'
                        }`}
                    >
                      {isFull ? 'Full' : 'Book Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal */}
      {selectedRide && (
        <BookingModal
          ride={selectedRide}
          isOpen={!!selectedRide}
          onClose={() => setSelectedRide(null)}
          onBookingConfirmed={() => executeSearch(fromStop, toStop, whenTime, seatsNeeded)}
        />
      )}
    </div>
  );
};
