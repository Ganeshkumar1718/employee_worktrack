import React, { useEffect } from 'react';

/**
 * IdleWarningModal Component
 * Displays a warning modal when user is inactive for 10 minutes
 * Shows a countdown and provides options to continue working or logout
 */
const IdleWarningModal = ({ isOpen, countdown, onContinue, onLogout }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Inactive Session</h2>
          <p className="text-gray-600 mb-6">
            You have been inactive for 10 minutes.
            <br />
            You will be automatically clocked out in
          </p>
          
          <div className="text-6xl font-bold text-red-600 mb-8">
            {countdown}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onContinue}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Continue Working
            </button>
            <button
              onClick={onLogout}
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdleWarningModal;
