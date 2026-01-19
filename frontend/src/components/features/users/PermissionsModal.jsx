// src/components/features/users/PermissionsModal.jsx
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@api/users';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

// Define all available modules and their actions
const PERMISSION_MODULES = [
  {
    module: 'materials',
    label: 'Materials',
    actions: ['view', 'create', 'update', 'delete', 'reorder'],
  },
  {
    module: 'sales',
    label: 'Sales',
    actions: ['view', 'create'],
  },
  {
    module: 'jobs',
    label: 'Jobs',
    actions: ['view', 'create', 'update', 'delete', 'complete'],
  },
  {
    module: 'invoices',
    label: 'Invoices',
    actions: ['view', 'create'],
  },
  {
    module: 'payments',
    label: 'Payments',
    actions: ['view', 'create'],
  },
  {
    module: 'expenses',
    label: 'Expenses',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    module: 'reports',
    label: 'Reports',
    actions: ['view'],
  },
  {
    module: 'users',
    label: 'Users',
    actions: ['view', 'create', 'update', 'delete', 'managePermissions'],
  },
  {
    module: 'bookings',
    label: 'Bookings',
    actions: ['view', 'update', 'delete'],
  },
  {
    module: 'settings',
    label: 'Settings',
    actions: ['view', 'update'],
  },
];

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  reorder: 'Reorder',
  complete: 'Complete',
  managePermissions: 'Manage Permissions',
};

export default function PermissionsModal({ isOpen, onClose, user }) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
    }
  }, [user]);

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }) => usersApi.updateUserPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
      alert('Permissions updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update permissions');
    },
  });

  const handleToggleAction = (module, action) => {
    setPermissions(prev => {
      const newPermissions = { ...prev };
      
      // Initialize module array if it doesn't exist
      if (!newPermissions[module]) {
        newPermissions[module] = [];
      }

      // Toggle the action
      const modulePermissions = [...newPermissions[module]];
      const actionIndex = modulePermissions.indexOf(action);
      
      if (actionIndex > -1) {
        // Remove action
        modulePermissions.splice(actionIndex, 1);
      } else {
        // Add action
        modulePermissions.push(action);
      }

      newPermissions[module] = modulePermissions;

      return newPermissions;
    });
  };

  const handleToggleModule = (module, actions) => {
    setPermissions(prev => {
      const newPermissions = { ...prev };
      const modulePermissions = newPermissions[module] || [];
      
      // If all actions are selected, deselect all
      if (modulePermissions.length === actions.length) {
        newPermissions[module] = [];
      } else {
        // Otherwise, select all actions
        newPermissions[module] = [...actions];
      }

      return newPermissions;
    });
  };

  const handleSelectAll = () => {
    const allPermissions = {};
    PERMISSION_MODULES.forEach(({ module, actions }) => {
      allPermissions[module] = [...actions];
    });
    setPermissions(allPermissions);
  };

  const handleClearAll = () => {
    setPermissions({});
  };

  const handleSubmit = () => {
    updatePermissionsMutation.mutate({
      id: user.id,
      permissions,
    });
  };

  if (!user) return null;

  const hasAction = (module, action) => {
    return permissions[module]?.includes(action) || false;
  };

  const hasAllModuleActions = (module, actions) => {
    const modulePermissions = permissions[module] || [];
    return actions.every(action => modulePermissions.includes(action));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Permissions - ${user.username}`}
      size="large"
    >
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Username:</span>
              <p className="font-medium text-gray-900">{user.username}</p>
            </div>
            <div>
              <span className="text-gray-600">Role:</span>
              <p className="font-medium text-gray-900 capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Admin Warning */}
        {user.role === 'admin' && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
            <p className="text-sm text-warning-700">
              <strong>Note:</strong> Admin users automatically have all permissions. Individual permission settings are ignored for admin accounts.
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={user.role === 'admin'}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={user.role === 'admin'}
          >
            Clear All
          </Button>
        </div>

        {/* Permissions Grid */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {PERMISSION_MODULES.map(({ module, label, actions }) => (
            <div key={module} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Module Header */}
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAllModuleActions(module, actions)}
                    onChange={() => handleToggleModule(module, actions)}
                    disabled={user.role === 'admin'}
                    className="rounded text-primary-600 w-4 h-4"
                  />
                  <span className="font-semibold text-gray-900">{label}</span>
                </label>
                <span className="text-xs text-gray-500">
                  {permissions[module]?.length || 0} / {actions.length} selected
                </span>
              </div>

              {/* Action Checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 ml-6">
                {actions.map(action => (
                  <label
                    key={action}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={hasAction(module, action)}
                      onChange={() => handleToggleAction(module, action)}
                      disabled={user.role === 'admin'}
                      className="rounded text-primary-600"
                    />
                    <span className="text-gray-700">{ACTION_LABELS[action]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
          <p className="text-sm text-primary-700">
            <strong>Total Permissions:</strong>{' '}
            {Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0)} actions across{' '}
            {Object.keys(permissions).filter(m => permissions[m].length > 0).length} modules
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={updatePermissionsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={updatePermissionsMutation.isPending}
            disabled={user.role === 'admin'}
          >
            Save Permissions
          </Button>
        </div>
      </div>
    </Modal>
  );
}