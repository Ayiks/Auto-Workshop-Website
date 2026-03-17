import { useState } from 'react';
import { useAuthStore } from '@stores/authStore';
import { useResponsive } from '@hooks/useResponsive';
import { RESPONSIVE_SPACING } from '@utils/responsiveHelpers';
import Card from '@components/common/Card';
import BusinessSettings from '@components/features/settings/BusinessSettings';
import ProfileSettings from '@components/features/settings/ProfileSettings';
import ServiceSettings from '@components/features/settings/ServiceSettings';
import UnitsManager from '@components/features/settings/UnitsManager';
import MessagingSettings from '@components/features/settings/MessagingSettings';
import { User, Building2, Wrench, Scale, MessageSquare } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
  { id: 'business', label: 'Business Profile', adminOnly: true, icon: <Building2 className="w-4 h-4" /> },
  { id: 'services', label: 'Service Pricing', adminOnly: true, icon: <Wrench className="w-4 h-4" /> },
  { id: 'units', label: 'Units of Measure', adminOnly: true, icon: <Scale className="w-4 h-4" /> },
  { id: 'messaging', label: 'Messaging', adminOnly: true, icon: <MessageSquare className="w-4 h-4" /> },
];

export default function Settings() {
  const { user, hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const visibleTabs = TABS.filter(tab => {
    if (!tab.adminOnly) return true;
    return user?.role === 'admin' || hasPermission('settings', 'update');
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-6 py-4 max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your workspace preferences</p>
        </div>
      </div>

      <div className="p-6 lg:p-8 max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-mono">Configuration</h3>
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className={activeTab === tab.id ? 'text-gray-300' : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'business' && <BusinessSettings />}
          {activeTab === 'services' && <ServiceSettings />}
          {activeTab === 'units' && <UnitsManager />}
          {activeTab === 'messaging' && <MessagingSettings />}
        </div>
      </div>
    </div>
  );
}