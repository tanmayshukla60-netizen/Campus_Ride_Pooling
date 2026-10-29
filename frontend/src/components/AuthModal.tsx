import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle,
  Car, Shield, Compass, Sparkles, HelpCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'DRIVER' | 'RIDER' | 'ADMIN';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialRole = 'RIDER' }) => {
  const { login, signup } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'DRIVER' | 'RIDER' | 'ADMIN'>(initialRole);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Sync selectedRole with initialRole whenever the modal opens or initialRole changes
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialRole]);

  const roleLabel = { DRIVER: 'Driver', RIDER: 'Rider', ADMIN: 'Admin' }[selectedRole];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const user = await login(email, password, selectedRole);
        setSuccess(`Signed in as ${user.full_name} (${user.role})!`);
        setTimeout(onClose, 600);
      } else {
        const user = await signup(fullName, email, password, selectedRole);
        setSuccess(`Account registered as ${user.role}! Welcome, ${user.full_name}!`);
        setTimeout(onClose, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-lg modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-card-static p-6 sm:p-8 shadow-2xl border-white/[0.08] max-h-[92vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="font-heading text-2xl font-bold text-white">
              {mode === 'login' ? 'Sign In to Campus Rides' : 'Create Account'}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Select your role below, then enter your credentials.
            </p>
          </div>

          {/* Step 1: Select Role (3 Options) */}
          <div className="space-y-2 mb-6">
            <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider text-center">
              Step 1: Choose Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* DRIVER OPTION */}
              <button
                type="button"
                onClick={() => setSelectedRole('DRIVER')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedRole === 'DRIVER'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedRole === 'DRIVER' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/[0.05] text-white/40'
                }`}>
                  <Car className="w-4 h-4" />
                </div>
                <div className="font-heading text-xs font-bold">Driver</div>
                <div className="text-[10px] text-white/30 leading-tight">Post rides & set fares</div>
              </button>

              {/* RIDER OPTION */}
              <button
                type="button"
                onClick={() => setSelectedRole('RIDER')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedRole === 'RIDER'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedRole === 'RIDER' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/[0.05] text-white/40'
                }`}>
                  <Compass className="w-4 h-4" />
                </div>
                <div className="font-heading text-xs font-bold">Rider</div>
                <div className="text-[10px] text-white/30 leading-tight">Search & book seats</div>
              </button>

              {/* ADMIN OPTION */}
              <button
                type="button"
                onClick={() => setSelectedRole('ADMIN')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedRole === 'ADMIN'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedRole === 'ADMIN' ? 'bg-purple-500/30 text-purple-300' : 'bg-white/[0.05] text-white/40'
                }`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="font-heading text-xs font-bold">Admin</div>
                <div className="text-[10px] text-white/30 leading-tight">Audit log & ledger</div>
              </button>
            </div>
          </div>

          {/* Error / Success alerts */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 animate-float-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs text-rose-300 font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 animate-float-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-300 font-medium">{success}</span>
            </div>
          )}

          {/* Step 2: Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider text-center">
              Step 2: Enter Your Credentials
            </div>

            {/* Quick 1-Click Demo Profiles for Evaluator/Sir */}
            {mode === 'login' && (
              <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1 font-semibold text-indigo-400">
                    <Sparkles className="w-3 h-3" /> Quick Demo Logins:
                  </span>
                  <span className="text-[10px] text-white/30">1-click fill</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('RIDER');
                      setEmail('priya.sharma2023@vitstudent.ac.in');
                      setPassword('Password123!');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-indigo-500/20 hover:border-indigo-500/40 border border-white/[0.06] text-[11px] text-white/70 hover:text-white transition-all text-center"
                  >
                    🧑‍🎓 Rider
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('DRIVER');
                      setEmail('arun.kumar2023@vitstudent.ac.in');
                      setPassword('Password123!');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/[0.06] text-[11px] text-white/70 hover:text-white transition-all text-center"
                  >
                    🚗 Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('ADMIN');
                      setEmail('admin@vitstudent.ac.in');
                      setPassword('Password123!');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 hover:border-purple-500/40 border border-white/[0.06] text-[11px] text-white/70 hover:text-white transition-all text-center"
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="input-dark w-full pl-10 text-xs py-3"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">VIT Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@vitstudent.ac.in"
                  className="input-dark w-full pl-10 text-xs py-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-dark w-full pl-10 pr-10 text-xs py-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-xs mt-4 flex items-center justify-center gap-2 transition-all shadow-lg ${
                selectedRole === 'DRIVER'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : selectedRole === 'ADMIN'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Signing in as {roleLabel}...</span>
                </>
              ) : (
                <span>
                  {mode === 'login' ? `Sign In as ${roleLabel}` : `Create ${roleLabel} Account`}
                </span>
              )}
            </button>
          </form>

          {/* Toggle Login / Signup */}
          <div className="mt-5 text-center">
            <span className="text-xs text-white/30">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              className="ml-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {mode === 'login' ? 'Create New Account' : 'Sign In'}
            </button>
          </div>

          {/* Quick Helper Accordion */}
          <div className="mt-6 border-t border-white/[0.06] pt-3 text-center">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{showHelp ? 'Hide quick credentials hint' : 'Show pre-seeded accounts reference'}</span>
            </button>
            {showHelp && (
              <div className="mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-left text-white/40 space-y-1">
                <div>• Driver: <span className="text-white/70">arun.kumar2023@vitstudent.ac.in</span> (Password123!)</div>
                <div>• Rider: <span className="text-white/70">priya.sharma2023@vitstudent.ac.in</span> (Password123!)</div>
                <div>• Admin: <span className="text-white/70">admin@vitstudent.ac.in</span> (Password123!)</div>
                <div className="text-[10px] text-white/25 mt-1">Or create any new user ending with @vitstudent.ac.in!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
