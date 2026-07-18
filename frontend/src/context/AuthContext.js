import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const interceptorRef = useRef(null);

  const logout = async (notifyServer = true) => {
    // Notify server to clear the active_token (server-side session invalidation)
    if (notifyServer) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Auto clock out before logging out
          try {
            await api.post('/api/attendance/logout', {});
          } catch (_) {
            // Ignore if not clocked in
          }
          await api.post('/api/auth/logout', {});
        }
      } catch (_) {
        // Ignore errors — we'll clear local state regardless
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    // Set up response interceptor for 401 errors (session expired / logged in elsewhere)
    interceptorRef.current = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Check if we have a user in state (i.e., they were authenticated)
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            // Clear local state without calling server (token already rejected)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            delete api.defaults.headers.common['Authorization'];
            setSessionExpired(true);
          }
        }
        return Promise.reject(error);
      }
    );

    // Auto-clockout when user closes tab/window
    const handleBeforeUnload = () => {
      const token = localStorage.getItem('token');
      if (token) {
        const getBaseURL = () => {
          if (process.env.REACT_APP_API_URL) {
            return process.env.REACT_APP_API_URL;
          }
          const hostname = window.location.hostname;
          return `http://${hostname}:5003`;
        };
        const baseURL = getBaseURL();
        fetch(`${baseURL}/api/attendance/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          keepalive: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      // Set auth header immediately so the validation request can use it
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      api.get('/api/auth/profile')
        .then((res) => {
          // Token is valid — hydrate user state with fresh data from database
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          setLoading(false);
        })
        .catch((error) => {
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token is explicitly expired/invalid/revoked — clear everything
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
            setSessionExpired(true);
          } else {
            // Network error, backend sleeping, or timeout - use cached data to prevent logging out
            setUser(JSON.parse(userData));
          }
          setLoading(false);
        });
    } else {
      // No stored credentials — finished loading, user is not authenticated
      setLoading(false);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (interceptorRef.current !== null) {
        api.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', {
      employee_email: email,
      employee_password: password
    });

    const { token, employee } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(employee));
    setUser(employee);
    setSessionExpired(false);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    const { token, employee } = response.data;
    if (token && employee) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(employee));
      setUser(employee);
      setSessionExpired(false);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return response.data;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, sessionExpired, setSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

