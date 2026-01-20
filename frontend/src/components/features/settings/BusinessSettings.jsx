// src/components/features/settings/BusinessSettings.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input, { Textarea } from '@components/common/Input';

export default function BusinessSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch business settings
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

  // Update when data loads
  useState(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
      });
    }
  }, [settings]);

  // Update business settings mutation
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
    updateMutation.mutate({
      name: formData.name.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      website: formData.website.trim() || undefined,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: settings?.name || '',
      address: settings?.address || '',
      phone: settings?.phone || '',
      email: settings?.email || '',
      website: settings?.website || '',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Loading business settings...</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your business details that appear on invoices and receipts
          </p>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit Settings
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Business Name */}
        <Input
          label="Business Name"
          name="name"
          value={isEditing ? formData.name : settings?.name || 'Not set'}
          onChange={handleChange}
          disabled={!isEditing}
          required
          placeholder="e.g., Auto Excellence Workshop"
        />

        {/* Address */}
        <Textarea
          label="Business Address"
          name="address"
          value={isEditing ? formData.address : settings?.address || 'Not set'}
          onChange={handleChange}
          disabled={!isEditing}
          required
          rows={3}
          placeholder="Full business address"
        />

        {/* Phone */}
        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          value={isEditing ? formData.phone : settings?.phone || 'Not set'}
          onChange={handleChange}
          disabled={!isEditing}
          required
          placeholder="+233 24 000 0000"
        />

        {/* Email */}
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={isEditing ? formData.email : settings?.email || 'Not set'}
          onChange={handleChange}
          disabled={!isEditing}
          required
          placeholder="info@workshop.com"
        />

        {/* Website */}
        <Input
          label="Website (Optional)"
          name="website"
          type="url"
          value={isEditing ? formData.website : settings?.website || 'Not set'}
          onChange={handleChange}
          disabled={!isEditing}
          placeholder="https://www.workshop.com"
        />
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-blue-900">Business Information Usage</p>
            <p className="text-blue-700 mt-1">
              These details appear on all invoices and receipts generated by the system. 
              Make sure they are accurate and up-to-date for professional documentation.
            </p>
          </div>
        </div>
      </div>

      {/* Logo Upload - Future Enhancement */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">Business Logo Upload</p>
          <p className="text-xs text-gray-500">Coming soon</p>
        </div>
      </div>
    </Card>
  );
}