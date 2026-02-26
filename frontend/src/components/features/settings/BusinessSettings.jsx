import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import LoadingSpinner from '@components/common/LoadingSpinner';

export default function BusinessSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
  });

  const settings = settingsResponse?.data;

  const [formData, setFormData] = useState({
    name: settings?.name || '',
    address: settings?.address || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    website: settings?.website || '',
  });

  // Re-sync state when data loads
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateBusinessSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['business-settings']);
      setIsEditing(false);
      alert('Business settings updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update settings');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (settings) setFormData(settings);
  };

  if (isLoading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-sm sm:text-base text-gray-900">Organization Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Details used for billing and documentation</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Details</Button>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="sm" onClick={handleCancel} className="flex-1 sm:flex-none">Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={updateMutation.isPending} className="flex-1 sm:flex-none bg-gray-900 hover:bg-black text-white">Save Changes</Button>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Business Name</label>
          <div className="sm:col-span-2">
            <input
              type="text"
              name="name"
              value={isEditing ? formData.name : settings?.name || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
              placeholder="e.g. Acme Corp"
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Contact Details</label>
          <div className="sm:col-span-2 space-y-3 sm:space-y-4">
            <div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input
                type="email"
                name="email"
                value={isEditing ? formData.email : settings?.email || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input
                type="tel"
                name="phone"
                value={isEditing ? formData.phone : settings?.phone || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Website</label>
                <input
                type="url"
                name="website"
                value={isEditing ? formData.website : settings?.website || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Address */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Physical Address</label>
          <div className="sm:col-span-2">
            <textarea
              name="address"
              rows={3}
              value={isEditing ? formData.address : settings?.address || ''}
              onChange={handleChange}
              disabled={!isEditing}
                        className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
            />
          </div>
        </div>
      </div>
    </Card>
  );
}