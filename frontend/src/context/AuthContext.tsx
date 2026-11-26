import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getDeviceFingerprint } from '../utils/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  matric_number: string;
  phone_number: string;
  role: 'student' | 'class_rep';
  is_email_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (matric_number: string, password: string) => Promise<{ status: string; email?: string }>;
  logout: () => void;
  setUserProfile: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null') {
      if (token) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Safety timeout: if request hangs on background wake-up, unblock UI without logging out
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    try {
      const data = await apiRequest('GET', '/api/auth/me');
      if (data.status === 'success') {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch (e: any) {
      // apiRequest already clears tokens and dispatches auth_change on 401/refresh failure.
      // Preserve session on transient network or cold-start errors.
      if (e?.message === 'Session expired. Please log in again.') {
        logout();
      } else {
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            setUser((prev) => prev ?? JSON.parse(cachedUser));
          } catch {
            // ignore malformed cached user JSON
          }
        }
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleAuthChange = () => {
      refreshUser();
    };

    window.addEventListener('auth_change', handleAuthChange);

    return () => {
      window.removeEventListener('auth_change', handleAuthChange);
    };
  }, []);

  const login = async (matric_number: string, password: string) => {
    const fingerprint = getDeviceFingerprint();
    const data = await apiRequest('POST', '/api/auth/login', {
      matric_number,
      password,
      device_fingerprint: fingerprint
    }, true);

    if (data.status === 'success') {
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }
    
    return data;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const setUserProfile = (user: User) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUserProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
