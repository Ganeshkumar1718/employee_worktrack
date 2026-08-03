import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Building2, User } from 'lucide-react';
import { notifySuccess, notifyError, requestNotificationPermission } from '../utils/notifications';

const Register = () => {
  const [role, setRole] = useState('employee'); // 'employee' or 'admin' (employer)
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_email: '',
    employee_password: '',
    department: '',
    designation: '',
    annual_package: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    // Request permission inside user gesture
    await requestNotificationPermission();

    const payload = {
      ...formData,
      role: role,
      department: formData.department || (role === 'admin' ? 'Management' : 'General'),
      designation: formData.designation || (role === 'admin' ? 'Employer / Administrator' : 'Staff Member'),
      annual_package: formData.annual_package ? Number(formData.annual_package) : 0
    };

    try {
      const data = await register(payload);
      notifySuccess('Registration Successful!', role === 'admin' ? 'Welcome Employer! Redirecting to Admin Portal...' : 'Welcome to WorkTrack Pro!');
      if (data.employee && (data.employee.role === 'admin' || role === 'admin')) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Please check your details.';
      setError(errMsg);
      notifyError('Registration Failed', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/20">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mr-3">
            <UserPlus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">WorkTrack Pro</h1>
        </div>
        
        <h2 className="text-xl font-bold text-gray-700 dark:text-slate-200 mb-4 text-center">Create New Account</h2>

        {/* Role Toggle: Employee vs Employer */}
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 text-center">
            Select Account Type
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleRoleChange('employee')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                role === 'employee'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Employee</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Employer / Admin</span>
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-slate-400 mt-2">
            {role === 'admin' ? '🏢 Register as an Employer/Admin to manage staff, payroll, and tasks' : '👤 Register as an Employee to track work hours, leaves, and salary'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-slate-300 text-sm font-semibold mb-1">
              {role === 'admin' ? 'Employer / Admin Name' : 'Full Name'}
            </label>
            <input
              type="text"
              name="employee_name"
              placeholder={role === 'admin' ? 'e.g. John Doe (Employer)' : 'e.g. Jane Smith'}
              value={formData.employee_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-slate-300 text-sm font-semibold mb-1">
              Work Email
            </label>
            <input
              type="email"
              name="employee_email"
              autoComplete="username"
              placeholder={role === 'admin' ? 'employer@company.com' : 'employee@company.com'}
              value={formData.employee_email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-slate-300 text-sm font-semibold mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="employee_password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={formData.employee_password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-semibold mb-1">
                Department {role === 'admin' && <span className="text-xs text-gray-400">(optional)</span>}
              </label>
              <input
                type="text"
                name="department"
                placeholder={role === 'admin' ? 'Management' : 'e.g. Engineering'}
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                required={role === 'employee'}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-semibold mb-1">
                Designation {role === 'admin' && <span className="text-xs text-gray-400">(optional)</span>}
              </label>
              <input
                type="text"
                name="designation"
                placeholder={role === 'admin' ? 'Director / CEO' : 'e.g. Full Stack Dev'}
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                required={role === 'employee'}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-slate-300 text-sm font-semibold mb-1">
              Annual Package (₹) {role === 'admin' && <span className="text-xs text-gray-400">(optional)</span>}
            </label>
            <input
              type="number"
              name="annual_package"
              placeholder={role === 'admin' ? 'e.g. 1500000 (optional)' : 'e.g. 600000'}
              value={formData.annual_package}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              required={role === 'employee'}
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl transition duration-300 font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              role === 'admin' ? 'Register as Employer / Admin' : 'Register as Employee'
            )}
          </button>
        </form>
        
        <p className="text-center text-gray-600 dark:text-slate-400 mt-6 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
