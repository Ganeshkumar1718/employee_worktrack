import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
          await axios.post('http://localhost:5003/api/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (_) {
        // Ignore errors — we'll clear local state regardless
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    // Set up response interceptor for 401 errors (session expired / logged in elsewhere)
    interceptorRef.current = axios.interceptors.response.use(
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
            delete axios.defaults.headers.common['Authorization'];
            setSessionExpired(true);
          }
        }
        return Promise.reject(error);
      }
    );

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      // Set auth header immediately so the validation request can use it
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      axios.get('http://localhost:5003/api/auth/profile')
        .then((res) => {
          // Token is valid — hydrate user state with fresh data from database
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          setLoading(false);
        })
        .catch(() => {
          // Token is expired/invalid/revoked — clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setSessionExpired(true);
          setLoading(false);
        });
    } else {
      // No stored credentials — finished loading, user is not authenticated
      setLoading(false);
    }

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, []);

  const login = async (email, password) => {
    const response = await axios.post('http://localhost:5003/api/auth/login', {
      employee_email: email,
      employee_password: password
    });

    const { token, employee } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(employee));
    setUser(employee);
    setSessionExpired(false);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return response.data;
  };

  const register = async (userData) => {
    const response = await axios.post('http://localhost:5003/api/auth/register', userData);
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
