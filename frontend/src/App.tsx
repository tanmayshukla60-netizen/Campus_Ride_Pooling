import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { FindRidesPage } from './pages/FindRidesPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { DriverPage } from './pages/DriverPage';
import { AdminPage } from './pages/AdminPage';
import { Database, ShieldCheck, Cpu } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('find');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialRole, setAuthInitialRole] = useState<'DRIVER' | 'RIDER' | 'ADMIN'>('RIDER');

  // Enforce role-appropriate tab when user logs in or switches role
  useEffect(() => {
    if (user?.role === 'DRIVER') {
      if (currentTab === 'my-bookings' || currentTab === 'admin') {
        setCurrentTab('driver');
      }
    } else if (user?.role === 'ADMIN') {
      setCurrentTab('admin');
    } else if (user?.role === 'RIDER' || user?.role === 'USER') {
      if (currentTab === 'driver' || currentTab === 'admin') {
        setCurrentTab('find');
      }
    }
  }, [user?.role]);

  return (
    <div className="min-h-screen flex flex-col relative bg-[#0B0F1A] text-slate-100">
      {/* Ambient background glow */}
      <div className="ambient-glow" />

      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if ((tab === 'my-bookings' || tab === 'driver' || tab === 'admin') && !user) {
            setAuthInitialRole(tab === 'driver' ? 'DRIVER' : tab === 'admin' ? 'ADMIN' : 'RIDER');
            setAuthModalOpen(true);
            return;
          }
          setCurrentTab(tab);
        }}
        onOpenAuth={(role) => {
          if (role) setAuthInitialRole(role);
          setAuthModalOpen(true);
        }}
      />

      <main className="flex-1 relative z-10 pb-16">
        {currentTab === 'find' && (
          <FindRidesPage
            onRequireAuth={() => {
              setAuthInitialRole('RIDER');
              setAuthModalOpen(true);
            }}
          />
        )}

        {currentTab === 'my-bookings' && user && (user.role === 'RIDER' || user.role === 'USER') && (
          <MyBookingsPage />
        )}

        {currentTab === 'driver' && user && user.role === 'DRIVER' && (
          <DriverPage
            onSwitchToRider={() => {
              setAuthInitialRole('RIDER');
              setAuthModalOpen(true);
            }}
          />
        )}

        {currentTab === 'admin' && user?.role === 'ADMIN' && <AdminPage />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-heading font-bold text-white/60">Campus Rides</span>
            <span className="text-white/15">·</span>
            <span>DBMS Course Final Project</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400/60" />
              PostgreSQL 16 · Raw SQL
            </span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/60" />
              Row-Level Locking
            </span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400/60" />
              Concurrency Safe
            </span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialRole={authInitialRole}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
