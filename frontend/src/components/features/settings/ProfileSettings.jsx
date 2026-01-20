// src/components/features/settings/ProfileSettings.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import { useAuthStore } from '@stores/authStore';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input from '@components/common/Input';

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const { user: currentUser, setUser } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile form
  const [profileData, setProfileData] = useState({
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch profile
  const { data: profileResponse } = useQuery({
    queryKey: ['profile'],
    queryFn: settingsApi.getProfile,
  });

  const profile = profileResponse?.data || currentUser;

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: (response) => {
      queryClient.invalidateQueries(['profile']);
      setUser(response.data); // Update auth store
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      settingsApi.changeOwnPassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      alert('Password changed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to change password');
    },
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      fullName: profileData.fullName.trim() || undefined,
      email: profileData.email.trim() || undefined,
      phone: profileData.phone.trim() || undefined,
    });
  };

  const handleSavePassword = () => {
    if (!validatePassword()) return;

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          {!isEditingProfile ? (
            <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileData({
                    fullName: profile?.fullName || '',
                    email: profile?.email || '',
                    phone: profile?.phone || '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                loading={updateProfileMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Username (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
              {profile?.username}
            </div>
            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 capitalize">
              {profile?.role}
            </div>
          </div>

          {/* Full Name */}
          <Input
            label="Full Name"
            name="fullName"
            value={isEditingProfile ? profileData.fullName : profile?.fullName || 'Not set'}
            onChange={handleProfileChange}
            disabled={!isEditingProfile}
          />

          {/* Email */}
          <Input
            label="Email"
            name="email"
            type="email"
            value={isEditingProfile ? profileData.email : profile?.email || 'Not set'}
            onChange={handleProfileChange}
            disabled={!isEditingProfile}
          />

          {/* Phone */}
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={isEditingProfile ? profileData.phone : profile?.phone || 'Not set'}
            onChange={handleProfileChange}
            disabled={!isEditingProfile}
          />
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
          {!isChangingPassword && (
            <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
              Change Password
            </Button>
          )}
        </div>

        {isChangingPassword ? (
          <div className="space-y-4">
            <Input
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
              error={errors.currentPassword}
            />

            <Input
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="At least 6 characters"
              error={errors.newPassword}
            />

            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Re-enter new password"
              error={errors.confirmPassword}
            />

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePassword}
                loading={changePasswordMutation.isPending}
              >
                Update Password
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">
            Click "Change Password" to update your password securely.
          </p>
        )}
      </Card>

      {/* Account Information */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Account Status:</span>
            <span className={`font-medium ${profile?.isActive ? 'text-success-600' : 'text-danger-600'}`}>
              {profile?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Member Since:</span>
            <span className="text-gray-900">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Login:</span>
            <span className="text-gray-900">
              {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}