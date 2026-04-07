// src/components/features/users/ChangePasswordModal.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@api/users';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import { toast } from 'react-hot-toast';
import Input from '@components/common/Input';

export default function ChangePasswordModal({ isOpen, onClose, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => usersApi.changeUserPassword(id, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
      setFormData({ newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to change password'),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    changePasswordMutation.mutate({
      id: user.id,
      newPassword: formData.newPassword,
    });
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm">
            <span className="text-gray-600">Changing password for:</span>
            <p className="font-medium text-gray-900 mt-1">
              {user.fullName || user.username}
            </p>
            <p className="text-gray-500">@{user.username}</p>
          </div>
        </div>

        {/* New Password */}
        <Input
          label="New Password"
          name="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="At least 6 characters"
          required
          disabled={changePasswordMutation.isPending}
          error={errors.newPassword}
        />

        {/* Confirm Password */}
        <Input
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter new password"
          required
          disabled={changePasswordMutation.isPending}
          error={errors.confirmPassword}
        />

        {/* Warning */}
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-2.5 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-warning-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs sm:text-sm text-warning-700">
              <strong>Warning:</strong> The user will need to use this new password for their next login. Make sure they receive the new password securely.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 sm:gap-3 border-t pt-3 sm:pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={changePasswordMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={changePasswordMutation.isPending}
          >
            Change Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}