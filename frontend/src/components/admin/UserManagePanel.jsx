import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, User, Mail, Phone, Shield, KeyRound, CheckCircle,
  ToggleLeft, ToggleRight, ExternalLink, Save, AlertTriangle,
} from 'lucide-react';
import { adminApi } from '@api/admin';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'sales', 'mechanic', 'sprayer', 'bodyworks'];

function Section({ title, children }) {
  return (
    <div className="border-t border-gray-700 pt-4 space-y-3">
      <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

export default function UserManagePanel({ user, onClose, invalidateKeys = [] }) {
  const queryClient = useQueryClient();

  const [editForm, setEditForm] = useState({
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Keep form in sync if user prop changes
  useEffect(() => {
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
    });
  }, [user.id]);

  const invalidate = () => {
    invalidateKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
  };

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, editForm),
    onSuccess: () => { toast.success('User updated'); invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: () => adminApi.verifyUserEmail(user.id),
    onSuccess: () => { toast.success('Email verified'); invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminApi.resetUserPassword(user.id, newPassword),
    onSuccess: () => { toast.success('Password reset'); setNewPassword(''); },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: () => adminApi.toggleUserStatus(user.id),
    onSuccess: (res) => { toast.success(`User ${res.data.isActive ? 'activated' : 'deactivated'}`); invalidate(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const impersonateMutation = useMutation({
    mutationFn: () => adminApi.impersonateUser(user.id),
    onSuccess: (res) => {
      const userEncoded = encodeURIComponent(btoa(JSON.stringify(res.user)));
      const url = `${window.location.origin}/impersonate?token=${encodeURIComponent(res.impersonationToken)}&u=${userEncoded}`;
      window.open(url, '_blank');
      toast.success('Impersonation session opened');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-700 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-700">
          <div>
            <p className="text-white font-semibold">{user.fullName || user.username}</p>
            <p className="text-gray-500 text-xs font-mono mt-0.5">@{user.username} · ID {user.id}</p>
            {user.business?.name && (
              <p className="text-indigo-400 text-xs mt-1">{user.business.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Quick status bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium capitalize">
              {user.role}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.isEmailVerified ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-400'}`}>
              {user.isEmailVerified ? 'Email Verified' : 'Email Unverified'}
            </span>
          </div>

          {/* Edit Details */}
          <Section title="Edit Details">
            <div className="space-y-2.5">
              <div>
                <label className="text-gray-500 text-xs block mb-1">Full Name</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Full name"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1">Email</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1">Phone</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1">Role</label>
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
              >
                <Save size={13} />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Section>

          {/* Email Verification */}
          <Section title="Email Verification">
            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <div>
                <p className="text-gray-200 text-sm">{user.email || <span className="text-gray-600 italic">No email set</span>}</p>
                <p className={`text-xs mt-0.5 ${user.isEmailVerified ? 'text-green-400' : 'text-amber-400'}`}>
                  {user.isEmailVerified ? 'Verified' : 'Not verified'}
                </p>
              </div>
              {!user.isEmailVerified && (
                <button
                  onClick={() => verifyEmailMutation.mutate()}
                  disabled={verifyEmailMutation.isPending || !user.email}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  <CheckCircle size={12} />
                  {verifyEmailMutation.isPending ? 'Verifying...' : 'Force Verify'}
                </button>
              )}
              {user.isEmailVerified && (
                <CheckCircle size={16} className="text-green-400" />
              )}
            </div>
          </Section>

          {/* Reset Password */}
          <Section title="Reset Password">
            <div className="space-y-2">
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-8 pr-16 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                onClick={() => {
                  if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
                  resetPasswordMutation.mutate();
                }}
                disabled={resetPasswordMutation.isPending || !newPassword}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm py-2 rounded-lg transition-colors"
              >
                <KeyRound size={13} />
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </Section>

          {/* Account Actions */}
          <Section title="Account Actions">
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} user "${user.username}"?`)) {
                    toggleMutation.mutate();
                  }
                }}
                disabled={toggleMutation.isPending}
                className={`w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-colors ${
                  user.isActive
                    ? 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30'
                    : 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30'
                }`}
              >
                {user.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                {user.isActive ? 'Deactivate Account' : 'Activate Account'}
              </button>

              {user.businessId && (
                <button
                  onClick={() => {
                    if (window.confirm(`Open a 1-hour session as "${user.username}" in a new tab?`)) {
                      impersonateMutation.mutate();
                    }
                  }}
                  disabled={impersonateMutation.isPending || !user.isActive}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-sm py-2 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} />
                  {impersonateMutation.isPending ? 'Opening...' : 'Impersonate User'}
                </button>
              )}

              {!user.isActive && user.businessId && (
                <p className="text-gray-600 text-xs flex items-center gap-1">
                  <AlertTriangle size={11} /> Activate the user before impersonating
                </p>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
