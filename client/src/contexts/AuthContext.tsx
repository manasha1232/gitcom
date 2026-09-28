import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface UserSession {
  id: string;
  githubUsername: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  githubToken?: string;
  settings?: any;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  loginWithToken: (token: string, username?: string) => Promise<UserSession>;
  loginAsPreconfigured: (username: string) => Promise<UserSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'commitflow_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const loginWithToken = async (token: string, username?: string): Promise<UserSession> => {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: UserSession }>('/auth/login-with-token', {
        token,
        username,
      });
      setUser(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const loginAsPreconfigured = async (username: string): Promise<UserSession> => {
    return loginWithToken('', username);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithToken,
        loginAsPreconfigured,
        logout,
      }}
    >
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
