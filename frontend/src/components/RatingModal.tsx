import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { X, Star, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface RatingModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onRated: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ booking, isOpen, onClose, onRated }) => {
  const [score, setScore] = useState<number>(5);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRate = async () => {
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/bookings/${booking.booking_id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      });
      setSuccess(true);
      onRated();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const labels = ['', 'Terrible', 'Poor', 'Average', 'Great', 'Excellent'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-md modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card-static p-7 shadow-2xl border-white/[0.08]">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>

          {!success ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/15 border-2 border-amber-500/25 flex items-center justify-center">
                  <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white">Rate Your Driver</h3>
                <p className="text-sm text-white/40 mt-1">
                  How was your ride with <span className="text-white/70 font-semibold">{booking.driver_name}</span>?
                </p>
              </div>

              {/* Star selector */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const isActive = n <= (hoveredStar || score);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScore(n)}
                        onMouseEnter={() => setHoveredStar(n)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-1 transition-transform hover:scale-125"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors duration-150 ${
                            isActive
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                              : 'text-white/15'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm font-semibold text-amber-400/70">{labels[hoveredStar || score]}</p>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-white/40 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  className="input-dark w-full resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-sm text-rose-300 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleRate}
                disabled={loading}
                className="w-full py-3.5 text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-white" />
                    <span>Submit Rating</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">Thanks for the Rating!</h3>
                <p className="text-sm text-white/40 mt-1">Driver's average rating has been updated via trigger.</p>
              </div>
              <button onClick={onClose} className="btn-glow w-full py-3 text-sm">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
