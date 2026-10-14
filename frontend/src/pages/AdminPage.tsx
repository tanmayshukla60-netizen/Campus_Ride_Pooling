import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import {
  Shield, Users, Car, BookmarkCheck, FileText, DollarSign,
  RefreshCw, ArrowRight, Clock, Database, Zap,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'USERS' | 'RIDES' | 'BOOKINGS' | 'PAYMENTS'>('AUDIT');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/overview');
      setOverview(data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOverview(); }, []);

  const tabs = [
    { id: 'AUDIT' as const, label: 'Audit Log', icon: FileText, color: 'amber' },
    { id: 'PAYMENTS' as const, label: 'Payment Ledger', icon: DollarSign, color: 'emerald' },
    { id: 'BOOKINGS' as const, label: 'Bookings', icon: BookmarkCheck, color: 'indigo' },
    { id: 'RIDES' as const, label: 'Rides', icon: Car, color: 'indigo' },
    { id: 'USERS' as const, label: 'Users', icon: Users, color: 'indigo' },
  ];

  const getCount = (key: string) => {
    const map: Record<string, string> = {
      AUDIT: 'auditLog', PAYMENTS: 'payments', BOOKINGS: 'bookings', RIDES: 'rides', USERS: 'users',
    };
    return overview?.[map[key]]?.length || 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-white">System Overview</h1>
          <p className="text-sm text-white/35 mt-1">
            Real-time database tables, immutable audit trail, and append-only payment ledger.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats row */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-in-up stagger-1">
          {[
            { label: 'Users', value: overview.users?.length || 0, icon: Users, color: 'indigo' },
            { label: 'Rides', value: overview.rides?.length || 0, icon: Car, color: 'purple' },
            { label: 'Bookings', value: overview.bookings?.length || 0, icon: BookmarkCheck, color: 'emerald' },
            { label: 'Payments', value: overview.payments?.length || 0, icon: DollarSign, color: 'amber' },
            { label: 'Audit Entries', value: overview.auditLog?.length || 0, icon: FileText, color: 'rose' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 text-${stat.color}-400/60`} />
                <div className="font-heading text-2xl font-extrabold text-white">{stat.value}</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in-up stagger-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                isActive
                  ? tab.color === 'amber'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10 border border-amber-500/20'
                    : tab.color === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10 border border-emerald-500/20'
                    : 'bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-500/10 border border-indigo-500/20'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label} ({getCount(tab.id)})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="glass-card p-20 text-center">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white/40">Gathering records...</p>
        </div>
      ) : (
        <div className="glass-card-static overflow-hidden animate-fade-in-up stagger-3">
          {/* AUDIT LOG */}
          {activeTab === 'AUDIT' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-dark">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Entity</th>
                    <th>Action</th>
                    <th>State Transition (JSONB)</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.auditLog?.map((a: any) => (
                    <tr key={a.id}>
                      <td className="text-white/40 whitespace-nowrap font-mono text-[11px]">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="font-bold text-white/80">{a.entity_type}</span>
                        <span className="block text-[10px] text-white/25 font-mono">{a.entity_id?.slice(0, 8)}…</span>
                      </td>
                      <td>
                        <span className="badge badge-amber text-[10px]">{a.action}</span>
                      </td>
                      <td className="max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-slate text-[10px]">{a.old_state?.status || JSON.stringify(a.old_state)}</span>
                          <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />
                          <span className="badge badge-emerald text-[10px]">{a.new_state?.status || JSON.stringify(a.new_state)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAYMENTS */}
          {activeTab === 'PAYMENTS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-dark">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Booking</th>
                    <th>Reason</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.payments?.map((p: any) => (
                    <tr key={p.id}>
                      <td className="text-white/40 font-mono text-[11px]">{p.id.slice(0, 8)}…</td>
                      <td>
                        <span className={`badge text-[10px] ${p.type === 'CHARGE' ? 'badge-emerald' : 'badge-rose'}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="font-bold text-sm">
                        <span className={p.type === 'REFUND' ? 'text-rose-400' : 'text-emerald-400'}>
                          {p.type === 'REFUND' ? '-' : '+'}₹{Number(p.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="text-white/30 font-mono text-[11px]">{p.booking_id.slice(0, 8)}…</td>
                      <td className="text-white/50 text-[11px]">{p.reason || '—'}</td>
                      <td className="text-white/30 whitespace-nowrap font-mono text-[11px]">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* BOOKINGS */}
          {activeTab === 'BOOKINGS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-dark">
                <thead>
                  <tr>
                    <th>Rider</th>
                    <th>Route</th>
                    <th>Seats</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Hold Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.bookings?.map((b: any) => (
                    <tr key={b.id}>
                      <td className="font-semibold text-white/80">{b.rider_name}</td>
                      <td className="text-white/50">{b.origin_stop_name} → {b.destination_stop_name}</td>
                      <td className="text-white/60">{b.seats_booked}</td>
                      <td className="font-bold text-white/70">₹{Number(b.total_price).toFixed(2)}</td>
                      <td>
                        <span className={`badge text-[10px] ${
                          b.status === 'CONFIRMED' ? 'badge-emerald' :
                          b.status === 'PENDING' ? 'badge-amber' :
                          b.status === 'COMPLETED' ? 'badge-indigo' :
                          b.status.includes('CANCELLED') ? 'badge-rose' : 'badge-slate'
                        }`}>{b.status}</span>
                      </td>
                      <td className="text-white/25 font-mono text-[10px]">
                        {new Date(b.hold_expires_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* RIDES */}
          {activeTab === 'RIDES' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-dark">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Departure</th>
                    <th>Seats</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.rides?.map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-semibold text-white/80">{r.driver_name}</td>
                      <td className="text-white/50">{r.origin_stop_name} → {r.destination_stop_name}</td>
                      <td className="text-white/40 font-mono text-[11px]">{new Date(r.departure_time).toLocaleString()}</td>
                      <td className="font-bold text-white/60">{r.seats_available}/{r.total_seats}</td>
                      <td className="font-bold text-white/70">₹{Number(r.price_per_seat).toFixed(2)}</td>
                      <td>
                        <span className={`badge text-[10px] ${
                          r.status === 'SCHEDULED' ? 'badge-emerald' :
                          r.status === 'COMPLETED' ? 'badge-indigo' : 'badge-slate'
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* USERS */}
          {activeTab === 'USERS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-dark">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>College Email</th>
                    <th>Role</th>
                    <th>Rating</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.users?.map((u: any) => (
                    <tr key={u.id}>
                      <td className="font-bold text-white/80">{u.full_name}</td>
                      <td className="font-mono text-white/40 text-[11px]">{u.email}</td>
                      <td>
                        <span className={`badge text-[10px] ${u.role === 'ADMIN' ? 'badge-amber' : 'badge-slate'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="text-amber-400 font-semibold text-[12px]">
                        ★ {Number(u.rating_avg).toFixed(1)} ({u.rating_count})
                      </td>
                      <td className="text-white/30 text-[11px]">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
