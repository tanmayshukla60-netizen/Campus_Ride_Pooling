import React, { useState, useEffect } from 'react';
import {
  QrCode, Camera, Copy, Check, ShieldCheck, Zap,
  Smartphone, ArrowLeft, RefreshCw, Lock
} from 'lucide-react';

interface MockQrScannerProps {
  amount: number;
  driverName: string;
  bookingId: string;
  route: string;
  secondsLeft: number;
  onPay: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export const MockQrScanner: React.FC<MockQrScannerProps> = ({
  amount,
  driverName,
  bookingId,
  route,
  secondsLeft,
  onPay,
  onCancel,
  loading,
}) => {
  const [mode, setMode] = useState<'QR' | 'CAMERA'>('QR');
  const [copied, setCopied] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [processingPhase, setProcessingPhase] = useState(0);

  const cleanDriverName = (driverName || 'Driver').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const upiId = `campus.${cleanDriverName || 'ride'}@vitupi`;

  // Simulate scanning detection when camera mode is active
  useEffect(() => {
    if (mode === 'CAMERA') {
      setScanned(false);
      const timer = setTimeout(() => {
        setScanned(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Simulate step messages during payment loading
  useEffect(() => {
    if (loading) {
      setProcessingPhase(1);
      const t1 = setTimeout(() => setProcessingPhase(2), 700);
      const t2 = setTimeout(() => setProcessingPhase(3), 1400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setProcessingPhase(0);
    }
  }, [loading]);

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to hold</span>
        </button>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-400">
          <Zap className="w-3 h-3" />
          <span>Hold: {minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setMode('QR')}
          disabled={loading}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            mode === 'QR'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Show UPI QR</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('CAMERA')}
          disabled={loading}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            mode === 'CAMERA'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera Scanner</span>
        </button>
      </div>

      {/* MODE 1: SHOW UPI QR */}
      {mode === 'QR' && (
        <div className="space-y-4">
          {/* QR Card Container */}
          <div className="relative mx-auto w-64 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.1] shadow-2xl flex flex-col items-center">
            {/* Viewfinder Corner Accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-400 rounded-tl-sm" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-400 rounded-tr-sm" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-400 rounded-bl-sm" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-400 rounded-br-sm" />

            {/* Simulated Animated Scanner Laser */}
            <div className="relative w-52 h-52 bg-white rounded-xl p-2.5 shadow-inner overflow-hidden flex items-center justify-center">
              {/* Laser Beam */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] z-10 animate-qr-laser pointer-events-none"
              />

              {/* High-fidelity Vector QR Code */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                {/* Corner Finder Top-Left */}
                <rect x="5" y="5" width="26" height="26" fill="black" rx="4" />
                <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                <rect x="13" y="13" width="10" height="10" fill="black" rx="1" />

                {/* Corner Finder Top-Right */}
                <rect x="69" y="5" width="26" height="26" fill="black" rx="4" />
                <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                <rect x="77" y="13" width="10" height="10" fill="black" rx="1" />

                {/* Corner Finder Bottom-Left */}
                <rect x="5" y="69" width="26" height="26" fill="black" rx="4" />
                <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                <rect x="13" y="77" width="10" height="10" fill="black" rx="1" />

                {/* Timing patterns */}
                <line x1="34" y1="13" x2="66" y2="13" stroke="black" strokeWidth="2.5" strokeDasharray="3,3" />
                <line x1="13" y1="34" x2="13" y2="66" stroke="black" strokeWidth="2.5" strokeDasharray="3,3" />

                {/* Matrix modules (data blocks) */}
                <rect x="36" y="20" width="6" height="6" fill="black" />
                <rect x="46" y="20" width="6" height="6" fill="black" />
                <rect x="56" y="20" width="6" height="6" fill="black" />

                <rect x="36" y="28" width="6" height="6" fill="black" />
                <rect x="50" y="28" width="8" height="6" fill="black" />

                <rect x="20" y="36" width="6" height="6" fill="black" />
                <rect x="28" y="36" width="6" height="6" fill="black" />
                <rect x="68" y="36" width="6" height="6" fill="black" />
                <rect x="78" y="36" width="6" height="6" fill="black" />

                <rect x="20" y="46" width="6" height="8" fill="black" />
                <rect x="68" y="46" width="8" height="6" fill="black" />
                <rect x="80" y="46" width="6" height="6" fill="black" />

                <rect x="36" y="66" width="6" height="6" fill="black" />
                <rect x="46" y="66" width="6" height="6" fill="black" />
                <rect x="56" y="66" width="6" height="6" fill="black" />

                <rect x="36" y="76" width="8" height="6" fill="black" />
                <rect x="48" y="76" width="6" height="6" fill="black" />
                <rect x="68" y="76" width="6" height="6" fill="black" />
                <rect x="78" y="76" width="6" height="6" fill="black" />

                <rect x="36" y="86" width="6" height="6" fill="black" />
                <rect x="56" y="86" width="8" height="6" fill="black" />
                <rect x="72" y="86" width="8" height="6" fill="black" />

                {/* Center Badge with Indian Rupee Symbol */}
                <circle cx="50" cy="50" r="11" fill="white" />
                <circle cx="50" cy="50" r="9.5" fill="#4f46e5" />
                <text x="50" y="55" fontSize="11" fontWeight="bold" textAnchor="middle" fill="white" fontFamily="sans-serif">₹</text>
              </svg>
            </div>

            {/* Merchant / Driver Name Tag */}
            <div className="mt-2.5 text-center">
              <span className="text-xs font-semibold text-white/80">{driverName}</span>
              <p className="text-[10px] text-white/40">Verified Campus Pool Driver</p>
            </div>
          </div>

          {/* Amount and UPI info */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
            <div>
              <span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider">UPI ID</span>
              <span className="font-mono text-white/80">{upiId}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Supported UPI Apps Badges */}
          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-white/40">
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">Google Pay</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">PhonePe</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">Paytm</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">BHIM UPI</span>
          </div>
        </div>
      )}

      {/* MODE 2: CAMERA SCANNER SIMULATOR */}
      {mode === 'CAMERA' && (
        <div className="space-y-4">
          <div className="relative mx-auto w-full h-64 rounded-2xl bg-black border border-white/15 overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Viewfinder Target */}
            <div className="relative w-44 h-44 rounded-xl border-2 border-dashed border-indigo-400/70 animate-viewfinder flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-3 border-l-3 border-emerald-400" />
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-3 border-r-3 border-emerald-400" />
              <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-3 border-l-3 border-emerald-400" />
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-3 border-r-3 border-emerald-400" />

              {/* Laser line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-qr-laser" />

              {/* Subdued QR in background for scanning */}
              <div className="w-24 h-24 opacity-25">
                <QrCode className="w-full h-full text-white" />
              </div>

              {/* Detection status tag */}
              <div className="absolute bottom-2 inset-x-2 text-center">
                {scanned ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    <Check className="w-2.5 h-2.5" />
                    QR DETECTED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    SCANNING...
                  </span>
                )}
              </div>
            </div>

            {/* Camera Overlay HUD */}
            <div className="absolute top-3 left-3 text-[10px] font-mono text-white/50 flex items-center gap-1">
              <Camera className="w-3 h-3 text-emerald-400" />
              <span>LIVE CAM (SIMULATED)</span>
            </div>
            <div className="absolute top-3 right-3 text-[10px] font-mono text-white/50">
              1080p • 60FPS
            </div>
          </div>

          {/* Scanner result card */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">Driver Target:</span>
              <span className="font-semibold text-white/90">{driverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Route:</span>
              <span className="text-white/70">{route}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Feedback */}
      {loading && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-300">
            <Lock className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {processingPhase === 1 && '1/3 Verifying 5m seat hold lease...'}
              {processingPhase === 2 && '2/3 Executing atomic PostgreSQL transaction...'}
              {processingPhase >= 3 && '3/3 Writing immutable audit & payment ledger...'}
            </span>
          </div>
          <p className="text-[11px] text-white/40">Guaranteed ACID isolation level: SERIALIZABLE</p>
        </div>
      )}

      {/* Pay Action Button */}
      <button
        onClick={onPay}
        disabled={loading}
        className="btn-coral w-full py-3.5 text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Authorizing ₹{amount.toFixed(2)}...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>Simulate & Pay ₹{amount.toFixed(2)}</span>
          </>
        )}
      </button>

      <p className="text-[11px] text-center text-white/30">
        Demo Mode: Mock UPI instant verification backed by real database trigger constraints.
      </p>
    </div>
  );
};
