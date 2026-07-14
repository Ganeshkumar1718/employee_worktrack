import React, { useEffect, useState, useRef } from 'react';

const ProfileModal = ({ open, onClose, user, onSave, title = 'Profile', submitLabel = 'Save Changes' }) => {
  const modalRef = useRef(null);
  const nameInputRef = useRef(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_email: '',
    department: '',
    designation: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        employee_name: user.employee_name || '',
        employee_email: user.employee_email || '',
        department: user.department || '',
        designation: user.designation || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setErrorMessage('');
    }
  }, [user, open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Use setTimeout to allow render before focusing and scrolling
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 50);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    if ((formData.new_password || formData.confirm_password) && formData.new_password !== formData.confirm_password) {
      setErrorMessage('New password and confirmation must match.');
      return;
    }

    if (formData.new_password && !formData.current_password) {
      setErrorMessage('Current password is required to change your password.');
      return;
    }

    setErrorMessage('');

    onSave(formData);
  };
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex justify-center items-center bg-slate-950/55 px-4 backdrop-blur-sm"
    >
      <div ref={modalRef} className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Account</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              ref={nameInputRef}
              value={formData.employee_name}
              onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={formData.employee_email}
              onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={user?.role !== 'admin'}
                className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 ${user?.role !== 'admin' ? 'bg-slate-200/60 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                disabled={user?.role !== 'admin'}
                className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 ${user?.role !== 'admin' ? 'bg-slate-200/60 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                required
              />
            </div>
          </div>
          {user?.role !== 'admin' && (
            <p className="text-xs text-slate-500 mt-1">Note: Department and Designation can only be changed by an administrator.</p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Change Password</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Current Password</label>
                <input
                  type="password"
                  name="current_password"
                  autoComplete="current-password"
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  placeholder="Enter current password to change it"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    autoComplete="new-password"
                    value={formData.new_password}
                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    autoComplete="new-password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">If you do not want to change your password, leave these fields empty.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;