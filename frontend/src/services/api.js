import axios from 'axios';

const getBaseURL = () => {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname.startsWith('192.168.') || 
                  hostname.startsWith('10.') || 
                  hostname.startsWith('172.') ||
                  hostname.endsWith('.local');
  
  return isLocal ? `http://${hostname}:5003` : 'https://employee-worktrack-1.onrender.com';
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
