import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertTriangle } from 'lucide-react';
import { notifySuccess, notifyError, requestNotificationPermission } from '../utils/notifications';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const { login, sessionExpired, setSessionExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    
    // Request permission inside user gesture
    await requestNotificationPermission();

    try {
      await login(email, password);
      notifySuccess('Login successful!', 'Welcome back to WorkTrack Pro.');
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errMsg);
      notifyError('Login Failed', errMsg);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <LogIn className="w-12 h-12 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">WorkTrack Pro</h1>
        </div>

        <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Login</h2>

        {/* Session expired banner — shown when user was kicked out by a new login elsewhere */}
        {sessionExpired && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-4">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-sm">Session Expired</p>
              <p className="text-xs mt-0.5">You were logged out because your account was accessed from another device or browser. Please login again.</p>
            </div>
            <button
              onClick={() => setSessionExpired(false)}
              className="ml-auto text-amber-500 hover:text-amber-700 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Register
          </button>
        </p>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600 text-sm mb-3">Want global activity tracking?</p>
          <a
            href="/WorkTrack-Setup.exe"
            download
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
          >
            Download Desktop App (Windows)
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
