// src/components/features/settings/ProfileSettings.jsx
import { useState, useEffect } from 'react'; // Import useEffect
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import { useAuthStore } from '@stores/authStore';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input from '@components/common/Input'; // Assuming you have this component

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const { user: currentUser, setUser } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false); // Added missing state

  // Password State
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Fetch profile
  const { data: profileResponse } = useQuery({
    queryKey: ['profile'],
    queryFn: settingsApi.getProfile,
  });

  // Use profile from API, fallback to auth store
  const profile = profileResponse?.data || currentUser;

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  // --- FIX 1: Use useEffect to sync state when profile loads ---
  useEffect(() => {
    if (profile) {
      setProfileData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: (response) => {
      // --- FIX 2: Handle Axios response structure safely ---
      // If response comes from Axios, the data is inside response.data
      const data = response.data || response; 
      const { user: updatedUser, token: newToken } = data;

      if (newToken) {
        localStorage.setItem('token', newToken);
      }
      
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser); // Update global store immediately
      }

      queryClient.invalidateQueries(['profile']);
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    },
    onError: (error) => {
      console.error("Update Error:", error);
      alert(error.response?.data?.message || error.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => settingsApi.changeOwnPassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
      alert('Password changed successfully!');
    },
    onError: (error) => alert(error.response?.data?.error || 'Failed to change password'),
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileData);
  };
  
  const handlePasswordSave = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return alert("Passwords do not match");
    if (passwordData.newPassword.length < 6) return alert("Password too short");
    changePasswordMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  return (
    <div className="space-y-6">
      {/* Personal Info Card */}
      <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Personal Information</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your personal account details</p>
          </div>
          {!isEditingProfile ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>Edit Details</Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setIsEditingProfile(false);
                  // Reset form to current profile data
                  if (profile) {
                    setProfileData({
                      fullName: profile.fullName || '',
                      email: profile.email || '',
                      phone: profile.phone || '',
                    });
                  }
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleProfileSave} loading={updateProfileMutation.isPending} className="bg-gray-900 hover:bg-black text-white">Save Changes</Button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Read Only Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                <div className="text-sm font-medium text-gray-900">{profile?.username}</div>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Role</label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 capitalize">
                  {profile?.role}
                </span>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Full Name</label>
                <input 
                    type="text" 
                    name="fullName"
                    value={profileData.fullName} 
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
                    <input 
                        type="email" 
                        name="email"
                        value={profileData.email} 
                        onChange={handleProfileChange}
                        disabled={!isEditingProfile}
                        className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Phone Number</label>
                    <input 
                        type="tel" 
                        name="phone"
                        value={profileData.phone} 
                        onChange={handleProfileChange}
                        disabled={!isEditingProfile}
                        className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                    />
                </div>
             </div>
          </div>
        </div>
      </Card>

      {/* Security Card */}
      <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Security & Login</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage your password and security settings</p>
          </div>
        </div>
        
        <div className="p-6">
            {!showPasswordSection ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-100 rounded-xl border border-gray-200">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Password</p>
                            <p className="text-xs text-gray-500 mt-0.5">Secure your account with a strong password</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordSection(true)}>Change Password</Button>
                </div>
            ) : (
                <div className="space-y-4 max-w-md bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Current Password</label>
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm Password</label>
                        <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button variant="primary" size="sm" onClick={handlePasswordSave} loading={changePasswordMutation.isPending} className="bg-gray-900 hover:bg-black text-white">Update Password</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowPasswordSection(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
      </Card>

      {/* Account Info Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="p-4 flex flex-col justify-center items-center text-center bg-gray-50 border-gray-200">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</span>
            <span className={`text-sm font-bold ${profile?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {profile?.isActive ? 'Active Account' : 'Inactive'}
            </span>
         </Card>
         <Card className="p-4 flex flex-col justify-center items-center text-center bg-gray-50 border-gray-200">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Member Since</span>
            <span className="text-sm font-medium text-gray-900">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </span>
         </Card>
         <Card className="p-4 flex flex-col justify-center items-center text-center bg-gray-50 border-gray-200">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Last Login</span>
            <span className="text-sm font-medium text-gray-900">
                {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}
            </span>
         </Card>
      </div>
    </div>
  );
}