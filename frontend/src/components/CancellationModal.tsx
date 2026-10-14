import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { X, AlertTriangle, CheckCircle, RotateCcw, ShieldAlert } from 'lucide-react';

interface CancellationModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({ booking, isOpen, onClose, onCancelled }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  // Calculate estimated refund
  const departureTime = new Date(booking.departure_time);
  const hoursUntil = (departureTime.getTime() - Date.now()) / (1000 * 3600);
  let refundPercent = 0;
  if (booking.booking_status === 'CONFIRMED') {
    if (hoursUntil > 24) refundPercent = 100;
    else if (hoursUntil >= 2) refundPercent = 50;
    else refundPercent = 0;
  }
  const estimatedRefund = (Number(booking.total_price) * refundPercent) / 100;

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<any>(`/bookings/${booking.booking_id}/cancel`, { method: 'POST' });
      setResult(res);
      onCancelled();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-md modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card-static p-7 shadow-2xl border-white/[0.08]">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>

          {!result ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-500/15 border-2 border-rose-500/25 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-rose-400" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white">Cancel Booking?</h3>
                <p className="text-sm text-white/40 mt-1.5">This action cannot be undone</p>
              </div>

              {/* Refund preview */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Route</span>
                  <span className="font-semibold text-white/80">{booking.origin_stop_name} → {booking.destination_stop_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Amount Paid</span>
                  <span className="font-bold text-white/80">₹{Number(booking.total_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Status</span>
                  <span className="font-bold text-white/60">{booking.booking_status}</span>
                </div>
              </div>

              {/* Refund tier */}
              {booking.booking_status === 'CONFIRMED' && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  refundPercent === 100 ? 'bg-emerald-500/8 border-emerald-500/15' :
                  refundPercent === 50 ? 'bg-amber-500/8 border-amber-500/15' :
                  'bg-rose-500/8 border-rose-500/15'
                }`}>
                  <div className="flex items-center gap-2">
                    <RotateCcw className={`w-4 h-4 ${
                      refundPercent === 100 ? 'text-emerald-400' :
                      refundPercent === 50 ? 'text-amber-400' : 'text-rose-400'
                    }`} />
                    <span className="text-sm font-bold text-white/80">
                      {refundPercent}% Refund — ₹{estimatedRefund.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">
                    {refundPercent === 100 ? '> 24 hours before departure → full refund' :
                     refundPercent === 50 ? '2–24 hours before departure → half refund' :
                     '< 2 hours before departure → no refund'}
                  </p>
                </div>
              )}

              {booking.booking_status === 'PENDING' && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/40 text-center">
                  Hold hasn't been paid yet — no charge, seats will be released instantly.
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300 font-medium">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">
                  Keep Booking
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Cancel & Refund</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">Booking Cancelled</h3>
                {Number(result.refund_amount) > 0 && (
                  <p className="text-sm text-emerald-400 font-semibold mt-2">
                    ₹{Number(result.refund_amount).toFixed(2)} refunded ({result.refund_percent}%)
                  </p>
                )}
              </div>
              <button onClick={onClose} className="btn-glow w-full py-3 text-sm">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
