// src/components/features/settings/ServiceSettings.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input from '@components/common/Input';

export default function ServiceSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch booth service
  const { data: serviceResponse, isLoading } = useQuery({
    queryKey: ['booth-service'],
    queryFn: settingsApi.getBoothService,
  });

  const service = serviceResponse?.data;

  const [price, setPrice] = useState(service?.price || '');
  const [error, setError] = useState('');

  // Update when data loads
  useState(() => {
    if (service?.price) {
      setPrice(service.price);
    }
  }, [service]);

  // Update booth price mutation
  const updateMutation = useMutation({
    mutationFn: settingsApi.updateBoothPrice,
    onSuccess: () => {
      queryClient.invalidateQueries(['booth-service']);
      setIsEditing(false);
      alert('Booth service price updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update price');
    },
  });

  const handleSave = () => {
    const priceValue = parseFloat(price);

    if (!price || priceValue <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    updateMutation.mutate(priceValue);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPrice(service?.price || '');
    setError('');
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Loading service settings...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booth Service Pricing */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Booth Service Pricing</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set the price for booth spray services
            </p>
          </div>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Price
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
          {/* Current Price Display */}
          {!isEditing && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Current Booth Service Price</p>
                <p className="text-4xl font-bold text-primary-700">
                  GH₵{parseFloat(service?.price || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Price Input */}
          {isEditing && (
            <Input
              label="Booth Service Price (GH₵)"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setError('');
              }}
              placeholder="Enter price"
              error={error}
              required
            />
          )}

          {/* Service Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">About Booth Service</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Booth service is a fixed-price service offering</li>
              <li>• No inventory tracking - unlimited usage</li>
              <li>• Can be sold at counter or included in jobs</li>
              <li>• Price can be updated anytime from this page</li>
              <li>• Changes apply immediately to new sales</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Service Statistics */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600">Service Type:</span>
            <p className="font-medium text-gray-900 capitalize">
              {service?.type || 'Booth'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600">Status:</span>
            <p className="font-medium text-success-600">
              {service?.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600">Last Updated:</span>
            <p className="font-medium text-gray-900">
              {service?.updatedAt ? new Date(service.updatedAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600">Current Price:</span>
            <p className="font-medium text-primary-600">
              GH₵{parseFloat(service?.price || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Warning */}
      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-warning-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-warning-900">Price Change Notice</p>
            <p className="text-warning-700 mt-1">
              Changing the booth service price only affects new sales and jobs. 
              Existing invoices and historical records will retain their original prices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}