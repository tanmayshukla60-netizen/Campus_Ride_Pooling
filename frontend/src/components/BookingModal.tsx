import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  X, Clock, CreditCard, CheckCircle, AlertCircle,
  ShieldCheck, Timer, Zap, Users, QrCode
} from 'lucide-react';
import { MockQrScanner } from './MockQrScanner';

interface BookingModalProps {
  ride: any;
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed: () => void;
}

type Step = 'PREVIEW' | 'HOLDING' | 'QR_PAYMENT' | 'PAYING' | 'CONFIRMED' | 'ERROR';

export const BookingModal: React.FC<BookingModalProps> = ({ ride, isOpen, onClose, onBookingConfirmed }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('PREVIEW');
  const [seatsToBook, setSeatsToBook] = useState<number>(1);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Countdown
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (ride?.booking_id) {
      setBookingData({ booking_id: ride.booking_id, hold_expires_at: ride.hold_expires_at });
      setSeatsToBook(ride.seats_booked || 1);
      setStep('HOLDING');
      if (ride.hold_expires_at) {
        startCountdown(ride.hold_expires_at);
      }
    } else {
      setStep('PREVIEW');
      setBookingData(null);
    }
  }, [ride]);

  const startCountdown = (expiresAt: string) => {
    const expiry = new Date(expiresAt).getTime();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStep('ERROR');
        setError('Your 5-minute seat hold has expired. Please try again.');
      }
    }, 1000);
  };

  const handleBookSeat = async () => {
    setLoading(true);
    setError('');
    try {
      const idempotencyKey = `${user?.id || 'usr'}-${ride.id}-${Date.now()}`;
      const res = await apiRequest<any>(`/rides/${ride.id}/book`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          seatsBooked: seatsToBook,
          idempotencyKey,
        }),
      });
      setBookingData(res);
      setStep('HOLDING');
      if (res.hold_expires_at) startCountdown(res.hold_expires_at);
    } catch (err: any) {
      setError(err.message || 'Failed to book seat');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingData?.booking_id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<any>(`/bookings/${bookingData.booking_id}/pay`, {
        method: 'POST',
      });
      setPaymentData(res);
      setStep('CONFIRMED');
      if (timerRef.current) clearInterval(timerRef.current);
      onBookingConfirmed();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPrice = Number(ride.price_per_seat) * seatsToBook;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-lg modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card-static p-7 shadow-2xl border-white/[0.08]">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* STEP: PREVIEW */}
          {step === 'PREVIEW' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white">Book This Ride</h3>
                <p className="text-sm text-white/40 mt-1">Seats held for 5 minutes after booking</p>
              </div>

              {/* Ride summary */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Route</span>
                  <span className="font-bold text-white/90">{ride.origin_stop_name} → {ride.destination_stop_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Departure</span>
                  <span className="font-semibold text-white/70">
                    {new Date(ride.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Driver</span>
                  <span className="font-semibold text-white/70">{ride.driver_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Price / Seat</span>
                  <span className="font-bold text-indigo-400">₹{Number(ride.price_per_seat).toFixed(2)}</span>
                </div>
              </div>

              {/* Seat selector */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Seats to Book
                </label>
                <select
                  value={seatsToBook}
                  onChange={(e) => setSeatsToBook(Number(e.target.value))}
                  className="input-dark w-full cursor-pointer"
                >
                  {Array.from({ length: Math.min(ride.seats_available, 4) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
                <span className="text-sm font-semibold text-white/60">Total Amount</span>
                <span className="font-heading text-2xl font-extrabold text-indigo-400">₹{totalPrice.toFixed(2)}</span>
              </div>

              <button
                onClick={handleBookSeat}
                disabled={loading}
                className="btn-glow w-full py-3.5 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reserving seats...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reserve Seat{seatsToBook > 1 ? 's' : ''} (5m Hold)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP: HOLDING — 5-minute countdown */}
          {step === 'HOLDING' && (
            <div className="space-y-6 text-center">
              <div>
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  isUrgent
                    ? 'bg-rose-500/15 border-2 border-rose-500/30 animate-urgent'
                    : 'bg-emerald-500/15 border-2 border-emerald-500/30'
                }`}>
                  <Timer className={`w-8 h-8 ${isUrgent ? 'text-rose-400' : 'text-emerald-400'}`} />
                </div>
                <h3 className="font-heading text-xl font-bold text-white">Seat Hold Active</h3>
                <p className="text-sm text-white/40 mt-1">Complete payment before the timer expires</p>
              </div>

              {/* Countdown */}
              <div className={`text-center p-5 rounded-2xl ${
                isUrgent ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-white/[0.03] border border-white/[0.06]'
              }`}>
                <div className={`font-heading text-5xl font-extrabold tracking-tight ${
                  isUrgent ? 'text-rose-400' : 'text-white'
                }`}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <p className="text-xs text-white/30 mt-1 font-medium">
                  {isUrgent ? 'Hurry! Hold expiring soon' : 'Time remaining on your seat hold'}
                </p>
              </div>

              {/* Booking summary */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Booking ID</span>
                  <span className="font-mono text-xs text-indigo-400">{bookingData?.booking_id?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Seats Reserved</span>
                  <span className="font-bold text-white/80">{seatsToBook}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Amount Due</span>
                  <span className="font-heading font-extrabold text-lg text-indigo-400">₹{totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setStep('QR_PAYMENT')}
                className="btn-coral w-full py-3.5 text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan UPI QR & Pay ₹{totalPrice.toFixed(2)}</span>
              </button>
            </div>
          )}

          {/* STEP: QR_PAYMENT — Mock UPI QR Code & Camera Scanner */}
          {step === 'QR_PAYMENT' && (
            <MockQrScanner
              amount={totalPrice}
              driverName={ride.driver_name}
              bookingId={bookingData?.booking_id || ''}
              route={`${ride.origin_stop_name} → ${ride.destination_stop_name}`}
              secondsLeft={secondsLeft}
              onPay={handlePayment}
              onCancel={() => setStep('HOLDING')}
              loading={loading}
            />
          )}

          {/* STEP: CONFIRMED */}
          {step === 'CONFIRMED' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-white">Booking Confirmed!</h3>
                <p className="text-sm text-white/40 mt-1.5">Your ride is secured. Have a safe journey! 🎉</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Status</span>
                  <span className="badge badge-emerald">CONFIRMED</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Amount Charged</span>
                  <span className="font-bold text-emerald-400">₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Transaction</span>
                  <span className="font-mono text-xs text-white/50">{paymentData?.payment?.id?.slice(0, 12)}...</span>
                </div>
              </div>

              <button onClick={onClose} className="btn-glow w-full py-3.5 text-sm">
                Done
              </button>
            </div>
          )}

          {/* STEP: ERROR */}
          {step === 'ERROR' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-rose-400" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">Something Went Wrong</h3>
                <p className="text-sm text-rose-300/70 mt-2 max-w-sm mx-auto">{error}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Close</button>
                <button
                  onClick={() => { setStep('PREVIEW'); setError(''); }}
                  className="btn-glow flex-1 py-3 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
