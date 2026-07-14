import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Bell } from 'lucide-react';

/**
 * Global Toast Container Component
 * Listens to custom 'worktrack-notification' events and displays
 * a beautiful, premium on-screen toast at the bottom-right corner.
 */
const ToastContainer = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleNotification = (e) => {
      const { message, body, type } = e.detail;
      setToast({ message, body, type });
    };

    window.addEventListener('worktrack-notification', handleNotification);
    return () => {
      window.removeEventListener('worktrack-notification', handleNotification);
    };
  }, []);

  // Auto-dismiss toast when state changes
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-[9999] animate-bounce border text-white transition-all duration-300 ${
      toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400' :
      toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400' :
      toast.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400' :
      'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400'
    }`}>
      {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
      {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
      {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      {toast.type === 'info' && <Bell className="w-5 h-5 flex-shrink-0" />}
      
      <div>
        <span className="font-semibold text-sm leading-tight block">{toast.message}</span>
        {toast.body && <p className="text-[11px] opacity-90 mt-0.5 max-w-xs">{toast.body}</p>}
      </div>

      <button 
        onClick={() => setToast(null)}
        className="ml-2 hover:opacity-80 text-white text-lg font-bold leading-none"
      >
        ×
      </button>
    </div>
  );
};

export default ToastContainer;
