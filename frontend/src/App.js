import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import SessionManager from './components/SessionManager';
import ToastContainer from './components/ToastContainer';

// Loading spinner shown during auth state hydration
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
    <div className="text-center text-white">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-lg font-semibold">Loading...</p>
    </div>
  </div>
);

// Public routes: redirect authenticated users away; allow unauthenticated or session-expired users in
const PublicRoute = ({ children }) => {
  const { user, loading, sessionExpired } = useAuth();

  if (loading) return <LoadingScreen />;

  // If there's a valid authenticated user (not just a session-expired cleared state), redirect to dashboard
  if (user && !sessionExpired) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

// Protected routes: redirect unauthenticated users to login, wrong-role users to their dashboard
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

// Root and wildcard redirect — sends users to correct destination based on auth state
const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <SessionManager>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="employee">
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<RootRoute />} />
            <Route path="*" element={<RootRoute />} />
          </Routes>
          <ToastContainer />
        </SessionManager>
      </Router>
    </AuthProvider>
  );
}

export default App;
