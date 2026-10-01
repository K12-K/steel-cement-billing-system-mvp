import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; reset_code?: string }>;
  resetPassword: (payload: { email: string; code: string; new_password: string }) => Promise<boolean>;
  changePassword: (payload: { current_password: string; new_password: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const fetchCurrentUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        clearStoredToken();
        setUser(null);
      }
    } catch (err) {
      clearStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await api.auth.login({ email, password });
      if (data.success && data.token && data.user) {
        setStoredToken(data.token);
        setUser(data.user);
        showToast(`Welcome back, ${data.user.name || data.user.email}!`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
      return false;
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<boolean> => {
    try {
      const data = await api.auth.register({ email, password, name });
      if (data.success && data.token && data.user) {
        setStoredToken(data.token);
        setUser(data.user);
        showToast('Registration successful! Welcome to the billing portal.', 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message || 'Registration failed.', 'error');
      return false;
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    showToast('You have been logged out securely.', 'info');
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await api.auth.forgotPassword(email);
      showToast(res.message, 'success');
      return res;
    } catch (err: any) {
      showToast(err.message || 'Error sending password reset request.', 'error');
      throw err;
    }
  };

  const resetPassword = async (payload: { email: string; code: string; new_password: string }): Promise<boolean> => {
    try {
      const res = await api.auth.resetPassword(payload);
      showToast(res.message, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
      return false;
    }
  };

  const changePassword = async (payload: { current_password: string; new_password: string }): Promise<boolean> => {
    try {
      const res = await api.auth.changePassword(payload);
      showToast(res.message, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to change password.', 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
