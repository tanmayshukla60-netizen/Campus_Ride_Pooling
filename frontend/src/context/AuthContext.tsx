import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getToken, setToken, clearToken } from '../api/client';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'DRIVER' | 'RIDER';
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: 'DRIVER' | 'RIDER' | 'ADMIN') => Promise<User>;
  signup: (fullName: string, email: string, password: string, role?: 'DRIVER' | 'RIDER' | 'ADMIN') => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const savedToken = getToken();
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiRequest<User>('/me');
      setUser(userData);
    } catch (err) {
      console.warn('Failed to fetch user session, logging out:', err);
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (
    email: string,
    password: string,
    role?: 'DRIVER' | 'RIDER' | 'ADMIN'
  ): Promise<User> => {
    const res = await apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const signup = async (
    fullName: string,
    email: string,
    password: string,
    role?: 'DRIVER' | 'RIDER' | 'ADMIN'
  ): Promise<User> => {
    const res = await apiRequest<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, role: role || 'RIDER' }),
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
