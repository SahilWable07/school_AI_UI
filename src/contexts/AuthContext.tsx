import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
}

interface Client {
  id: string;
  orgn_details: Array<{
    orgn_name: string;
    orgn_type: string;
    logo: string;
    address: string;
  }>;
  primary_info: Array<{
    orgn_email: string;
    short_name: string;
  }>;
  status: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  selectedClient: Client | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectClient: (client: Client) => void;
  clearClient: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'https://dt1wp7hrm9.execute-api.ap-south-1.amazonaws.com/auth/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          selectedClient: null,
        };
      }
    }
    return {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      selectedClient: null,
    };
  });

  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(state));
  }, [state]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    setState({
      isAuthenticated: true,
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      selectedClient: null,
    });
  }, []);

  const logout = useCallback(() => {
    setState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      selectedClient: null,
    });
    localStorage.removeItem('auth');
  }, []);

  const selectClient = useCallback((client: Client) => {
    setState(prev => ({ ...prev, selectedClient: client }));
  }, []);

  const clearClient = useCallback(() => {
    setState(prev => ({ ...prev, selectedClient: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, selectClient, clearClient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { User, Client };
