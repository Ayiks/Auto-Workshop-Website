// src/components/features/users/PermissionsModal.jsx
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@api/users';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

// ... (PERMISSION_MODULES and ACTION_LABELS arrays remain exactly the same as your code) ...
const PERMISSION_MODULES = [
  { module: 'materials', label: 'Materials', actions: ['view', 'create', 'update', 'delete', 'reorder'] },
  { module: 'sales', label: 'Sales', actions: ['view', 'create'] },
  { module: 'jobs', label: 'Jobs', actions: ['view', 'create', 'update', 'delete', 'complete'] },
  { module: 'invoices', label: 'Invoices', actions: ['view', 'create'] },
  { module: 'payments', label: 'Payments', actions: ['view', 'create'] },
  { module: 'expenses', label: 'Expenses', actions: ['view', 'create', 'update', 'delete'] },
  { module: 'reports', label: 'Reports', actions: ['view'] },
  { module: 'users', label: 'Users', actions: ['view', 'create', 'update', 'delete', 'managePermissions'] },
  { module: 'bookings', label: 'Bookings', actions: ['view', 'update', 'delete'] },
  { module: 'settings', label: 'Settings', actions: ['view', 'update'] },
  { module: 'customers', label: 'Customers', actions: ['view', 'create', 'update', 'delete'] },
];

const ACTION_LABELS = {
  view: 'View', create: 'Create', update: 'Update', delete: 'Delete',
  reorder: 'Reorder', complete: 'Complete', managePermissions: 'Permissions',
};

export default function PermissionsModal({ isOpen, onClose, user }) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (user?.permissions) setPermissions(user.permissions);
  }, [user]);

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }) => usersApi.updateUserPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
    },
    onError: (error) => alert(error.response?.data?.error || 'Failed update'),
  });

  // ... (Keep handleToggleAction, handleToggleModule, handleSelectAll, handleClearAll logic exactly as is) ...
  const handleToggleAction = (module, action) => {
    setPermissions(prev => {
      const newPermissions = { ...prev };
      if (!newPermissions[module]) newPermissions[module] = [];
      const idx = newPermissions[module].indexOf(action);
      if (idx > -1) newPermissions[module].splice(idx, 1);
      else newPermissions[module].push(action);
      return newPermissions;
    });
  };

  const handleToggleModule = (module, actions) => {
    setPermissions(prev => {
      const currentLen = prev[module]?.length || 0;
      return { ...prev, [module]: currentLen === actions.length ? [] : [...actions] };
    });
  };

  const handleSelectAll = () => {
    const all = {};
    PERMISSION_MODULES.forEach(m => all[m.module] = [...m.actions]);
    setPermissions(all);
  };

  const handleClearAll = () => setPermissions({});

  const handleSubmit = () => {
    updatePermissionsMutation.mutate({ id: user.id, permissions });
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const hasAction = (m, a) => permissions[m]?.includes(a);
  const hasAll = (m, acts) => acts.every(a => permissions[m]?.includes(a));

  // Calculate stats for the footer
  const activeModules = Object.keys(permissions).filter(k => permissions[k]?.length > 0).length;
  const totalActions = Object.values(permissions).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Permissions"
      size="xl" // Made slightly wider
    >
      <div className="flex flex-col h-full max-h-[80vh]">
        
        {/* Header Section */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Configuring access for</p>
              <p className="text-lg font-bold text-gray-900">{user.username}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
              isAdmin ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Role
            </div>
          </div>

          {isAdmin ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3 items-start">
               <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               <div>
                 <p className="font-medium text-yellow-800">Admin Privileges Override</p>
                 <p className="text-sm text-yellow-700 mt-1">
                   Admins have full access to all modules by default. These settings will be saved but will not restrict this user until their role is changed.
                 </p>
               </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAll}>Select All</Button>
              <Button size="sm" variant="outline" onClick={handleClearAll}>Clear All</Button>
            </div>
          )}
        </div>

        {/* Scrollable Permissions Grid */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            {PERMISSION_MODULES.map(({ module, label, actions }) => (
              <div 
                key={module} 
                className={`p-4 rounded-lg border transition-all ${
                  permissions[module]?.length > 0 
                    ? 'bg-white border-indigo-200 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasAll(module, actions)}
                      onChange={() => handleToggleModule(module, actions)}
                      disabled={isAdmin}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4 h-4"
                    />
                    <span className={`font-semibold ${permissions[module]?.length ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {label}
                    </span>
                  </label>
                  <span className="text-xs font-medium text-gray-400">
                    {permissions[module]?.length || 0}/{actions.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                  {actions.map(action => (
                    <label key={action} className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={hasAction(module, action) || false}
                        onChange={() => handleToggleAction(module, action)}
                        disabled={isAdmin}
                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-3.5 h-3.5"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        {ACTION_LABELS[action]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Summary & Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500 hidden sm:block">
            <span className="font-medium text-indigo-600">{totalActions}</span> permissions active in <span className="font-medium text-indigo-600">{activeModules}</span> modules
          </div>
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              loading={updatePermissionsMutation.isPending}
              disabled={isAdmin}
            >
              Save Permissions
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}