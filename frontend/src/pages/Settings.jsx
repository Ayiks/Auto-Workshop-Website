// src/pages/Settings.jsx
import { useState } from 'react';
import { useAuthStore } from '@stores/authStore';
import Card from '@components/common/Card';
import BusinessSettings from '@components/features/settings/BusinessSettings';
import ProfileSettings from '@components/features/settings/ProfileSettings';
import ServiceSettings from '@components/features/settings/ServiceSettings';

const TABS = [
  { id: 'profile', label: 'My Profile' },
  { id: 'business', label: 'Business Settings', adminOnly: true },
  { id: 'services', label: 'Service Pricing',  adminOnly: true },
];

export default function Settings() {
  const { user, hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Filter tabs based on permissions
  const visibleTabs = TABS.filter(tab => {
    if (!tab.adminOnly) return true;
    return user?.role === 'admin' || hasPermission('settings', 'update');
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your profile and system configuration
        </p>
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'business' && <BusinessSettings />}
        {activeTab === 'services' && <ServiceSettings />}
      </div>
    </div>
  );
}