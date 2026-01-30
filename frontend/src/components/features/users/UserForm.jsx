// src/components/features/users/UserForm.jsx
import { useState, useEffect } from 'react';
import Button from '@components/common/Button'; // reusing your common button

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'sales', label: 'Sales' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'sprayer', label: 'Sprayer' },
  { value: 'bodyworks', label: 'Body Works' },
];

export default function UserForm({ user, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    confirmPassword: '',
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'sales',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        confirmPassword: '',
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Min 3 characters';
    }

    // Password validation (only for new users)
    if (!user) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!formData.role) newErrors.role = 'Role is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData = {
      username: formData.username.trim().toLowerCase(),
      fullName: formData.fullName.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      role: formData.role,
    };

    if (!user) submitData.password = formData.password;
    onSubmit(submitData);
  };

  // Helper class for inputs to avoid repetition
  const inputClass = (hasError) => `
    w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors
    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-gray-100 disabled:text-gray-500
    ${hasError ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-200' : 'border-gray-300 text-gray-900'}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Username <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading || !!user}
          className={inputClass(errors.username)}
          placeholder="e.g. john.doe"
        />
        {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
      </div>

      {/* Password Fields (New User Only) */}
      {!user && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className={inputClass(errors.password)}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              className={inputClass(errors.confirmPassword)}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          disabled={isLoading}
          className={inputClass(false)}
        />
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass(errors.email)}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass(false)}
            placeholder="+233..."
          />
        </div>
      </div>

      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={isLoading}
          className={inputClass(errors.role)}
        >
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
        
        {/* Role Helper Text */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-800 leading-5">
              {formData.role === 'admin' && 'Full system access: Manage users, settings, and all modules.'}
              {formData.role === 'sales' && 'Sales access: Counter sales, payments, and daily reports.'}
              {formData.role === 'mechanic' && 'Workshop access: View assigned jobs, add parts, update labor.'}
              {formData.role === 'sprayer' && 'Workshop access: View assigned spray jobs, material usage.'}
              {formData.role === 'bodyworks' && 'Workshop access: Body repair jobs, estimations.'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          {user ? 'Save Changes' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
}