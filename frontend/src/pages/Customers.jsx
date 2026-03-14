import CustomersManager from '@components/features/settings/CustomersManager';

export default function Customers() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer records, vehicles and reminders</p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <CustomersManager />
      </div>
    </div>
  );
}
