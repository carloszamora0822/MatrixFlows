import { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const response = await fetch(getApiUrl('/api/users/me'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      localStorage.removeItem('authToken');
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.error?.message || 'Login failed');
        return { success: false, error: data.error?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Network error - please try again');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
      
      localStorage.removeItem('authToken');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed');
      // Still clear user and token even if logout request fails
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isEditor: user?.role === 'admin' || user?.role === 'editor',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
