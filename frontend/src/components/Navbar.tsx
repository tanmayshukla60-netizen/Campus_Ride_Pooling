import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Car, Compass, BookmarkCheck, Shield, PlusCircle, LogOut,
  Star, Zap, Users, UserCheck, ArrowRight, RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: (role?: 'DRIVER' | 'RIDER' | 'ADMIN') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenAuth }) => {
  const { user, logout } = useAuth();

  const isDriver = user?.role === 'DRIVER';
  const isRider = user?.role === 'RIDER' || (user && user.role === 'USER');
  const isAdmin = user?.role === 'ADMIN';

  // Role-strict tab configuration
  const getTabs = () => {
    if (!user) {
      return [
        { id: 'find', label: 'Find Rides', icon: Compass },
      ];
    }
    if (isDriver) {
      return [
        { id: 'driver', label: 'Driver Hub (Post Rides & Set Fares)', icon: PlusCircle },
        { id: 'find', label: 'Browse Campus Rides', icon: Compass },
      ];
    }
    if (isAdmin) {
      return [
        { id: 'admin', label: 'Admin Control Center', icon: Shield },
      ];
    }
    // Rider
    return [
      { id: 'find', label: 'Find Rides', icon: Compass },
      { id: 'my-bookings', label: 'My Bookings', icon: BookmarkCheck },
    ];
  };

  const tabs = getTabs();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0B0F1A]/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onSelectTab(isDriver ? 'driver' : isAdmin ? 'admin' : 'find')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all duration-200">
            <Car className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
              Campus Rides
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              DBMS Project
            </span>
          </div>
        </div>

        {/* Center Navigation - STRICTLY ROLE FILTERED */}
        <nav className="hidden md:flex items-center gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const isTabAdmin = tab.id === 'admin';
            const isTabDriver = tab.id === 'driver';
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? isTabAdmin
                      ? 'bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/30 font-bold'
                      : isTabDriver
                      ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30 font-bold'
                      : 'bg-indigo-600/20 text-indigo-300 shadow-sm border border-indigo-500/30 font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${
                  isActive ? (isTabAdmin ? 'text-purple-400' : isTabDriver ? 'text-amber-400' : 'text-indigo-400') : ''
                }`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              {/* User role & name badge */}
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-white leading-tight">
                  {user.full_name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    isAdmin
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : isDriver
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {user.role === 'ADMIN' ? 'Admin' : user.role === 'DRIVER' ? 'Driver' : 'Rider'}
                  </span>
                  <span className="text-[10px] text-white/30 hidden lg:inline">
                    ({user.email})
                  </span>
                </div>
              </div>

              {/* Switch Role Quick Button */}
              <button
                onClick={() => onOpenAuth()}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white text-xs font-semibold border border-white/[0.08] transition-all flex items-center gap-1"
                title="Switch between Driver, Rider, and Admin roles"
              >
                <RefreshCw className="w-3 h-3 text-indigo-400" />
                <span className="hidden sm:inline">Switch Role</span>
              </button>

              {/* Logout */}
              <button
                id="btn-logout"
                onClick={logout}
                title="Sign out"
                className="p-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('DRIVER')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all hidden sm:flex items-center gap-1.5"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Driver Login</span>
              </button>

              <button
                onClick={() => onOpenAuth('RIDER')}
                className="btn-glow px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Sign In / Choose Role</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.04] py-1 bg-[#0B0F1A]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-indigo-400' : 'text-white/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
