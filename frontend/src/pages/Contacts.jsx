import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CustomersManager from '@components/features/settings/CustomersManager';
import SuppliersManager from '@components/features/suppliers/SuppliersManager';

export default function Contacts() {
  const location = useLocation();
  const initial = location.state?.tab === 'suppliers' || new URLSearchParams(location.search).get('tab') === 'suppliers'
    ? 'suppliers'
    : 'customers';

  const [activeTab, setActiveTab] = useState(initial);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customers and suppliers</p>
        </div>

        {/* Tab switcher */}
        <div className="flex px-4 sm:px-6 gap-1">
          {[
            { key: 'customers', label: 'Customers' },
            { key: 'suppliers', label: 'Suppliers' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {activeTab === 'customers' ? <CustomersManager /> : <SuppliersManager />}
      </div>
    </div>
  );
}
