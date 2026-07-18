import axios from 'axios';

const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname.startsWith('192.168.') || 
                  hostname.startsWith('10.') || 
                  hostname.startsWith('172.') ||
                  hostname.endsWith('.local');
  
  return isLocal ? `http://${hostname}:5003` : 'https://worktrack-pro-backend.onrender.com';
};

const api = axios.create({
  baseURL: getBaseURL()
});

// Request interceptor to automatically attach authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
