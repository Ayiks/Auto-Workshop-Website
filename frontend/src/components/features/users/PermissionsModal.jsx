import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@api/users';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

// 1. DEFINE YOUR MODULES
const PERMISSION_MODULES = [
  { module: 'materials', label: 'Materials', actions: ['view', 'create', 'update', 'delete', 'reorder'] },
  { module: 'sales', label: 'Sales', actions: ['view', 'create', 'update'] },
  { module: 'jobs', label: 'Jobs', actions: ['view', 'create', 'update', 'delete', 'complete'] },
  { module: 'invoices', label: 'Invoices', actions: ['view', 'create'] },
  { module: 'payments', label: 'Payments', actions: ['view', 'create'] },
  { module: 'expenses', label: 'Expenses', actions: ['view', 'create', 'update', 'delete'] },
  { module: 'reports', label: 'Reports', actions: ['view'] },
  { module: 'users', label: 'Users', actions: ['view', 'create', 'update', 'delete', 'managePermissions'] },
  { module: 'bookings', label: 'Bookings', actions: ['view', 'update', 'delete'] },
  { module: 'settings', label: 'Settings', actions: ['view', 'update'] },
  { module: 'customers', label: 'Customers', actions: ['view', 'create', 'update', 'delete'] },
  { module: 'units', label: 'Units of Measure', actions: ['create', 'update', 'delete'] },
  { module: 'booth', label: 'Booth Services', actions: ['view', 'create', 'update', 'delete'] },
];

const ACTION_LABELS = {
  view: 'View', create: 'Create', update: 'Update', delete: 'Delete',
  reorder: 'Reorder', complete: 'Complete', managePermissions: 'Permissions',
};

// 2. DEFINE DEPENDENCIES (The Rules)
// Syntax: 'module.action': ['targetModule.targetAction', 'targetModule2.targetAction']
const PERMISSION_DEPENDENCIES = {
  // If you Create Sales, you need to View Materials and View Sales
  'sales.create': ['materials.view', 'sales.view', 'customers.view', 'booth.view'],
  
  // If you Create Jobs, you need to View Materials, Bookings, and Customers
  'jobs.create': ['materials.view', 'bookings.view', 'customers.view', 'jobs.view', 'booth.view'],
  
  // If you Reorder Materials, you must be able to View them
  'materials.reorder': ['materials.view'],
  
  // General rule: specific actions usually require 'view' access to that module
  'materials.create': ['materials.view'],
  'materials.update': ['materials.view'],
  'invoices.create': ['sales.view', 'invoices.view'],
  'payments.create': ['invoices.view', 'payments.view'],
  'bookings.update': ['bookings.view'],
  'booth.create': ['booth.view', 'booth.update'],
};

export default function PermissionsModal({ isOpen, onClose, user }) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState({});

  // Initialize State safely
  useEffect(() => {
    if (isOpen && user) {
        setPermissions(user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : {});
    }
  }, [user?.id, isOpen]); 

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }) => usersApi.updateUserPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
    },
    onError: (error) => alert(error.response?.data?.error || 'Failed update'),
  });

  // --- LOGIC: Recursive Permission Adder ---
  // This ensures that if A needs B, and B needs C, selecting A automatically selects B and C.
  const addPermissionWithDependencies = (prevPermissions, module, action) => {
    let newPermissions = { ...prevPermissions };
    
    // 1. Ensure the module array exists
    if (!newPermissions[module]) newPermissions[module] = [];
    
    // 2. Add the action if not present
    if (!newPermissions[module].includes(action)) {
        newPermissions[module] = [...newPermissions[module], action];
    }

    // 3. Check for dependencies
    const ruleKey = `${module}.${action}`;
    const dependencies = PERMISSION_DEPENDENCIES[ruleKey];

    if (dependencies) {
        dependencies.forEach(dep => {
            const [depModule, depAction] = dep.split('.');
            // Recursively add dependencies
            newPermissions = addPermissionWithDependencies(newPermissions, depModule, depAction);
        });
    }

    return newPermissions;
  };

  const handleToggleAction = (module, action) => {
    setPermissions(prev => {
      const currentActions = prev[module] ? [...prev[module]] : [];
      
      // CASE 1: Deselecting
      if (currentActions.includes(action)) {
        return { 
            ...prev, 
            [module]: currentActions.filter(a => a !== action) 
        };
      } 
      
      // CASE 2: Selecting (Trigger Dependencies)
      else {
        return addPermissionWithDependencies(prev, module, action);
      }
    });
  };

  const handleToggleModule = (module, actions) => {
    setPermissions(prev => {
      const currentLen = prev[module]?.length || 0;
      const isSelectingAll = currentLen !== actions.length;

      if (isSelectingAll) {
          // If selecting all, we must run each action through the dependency checker
          let newState = { ...prev };
          actions.forEach(act => {
              newState = addPermissionWithDependencies(newState, module, act);
          });
          return newState;
      } else {
          // If deselecting all, just clear this module
          // (We usually don't auto-deselect dependencies in other modules to avoid data loss)
          return { ...prev, [module]: [] };
      }
    });
  };

  // ... (Rest of the component remains exactly the same) ...
  const handleSelectAll = () => {
    let all = {};
    // We iterate through every module and action and use the dependency logic 
    // to ensure consistency, though strictly just adding everything works too.
    PERMISSION_MODULES.forEach(m => {
        all[m.module] = [...m.actions];
    });
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

  const activeModules = Object.keys(permissions).filter(k => permissions[k]?.length > 0).length;
  const totalActions = Object.values(permissions).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Permissions"
      size="xl"
    >
      <div className="flex flex-col h-full max-h-[80vh]">
        
        {/* Header */}
        <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Configuring access for</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{user.username}</p>
            </div>
            <div className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${
              isAdmin ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Role
            </div>
          </div>

          {isAdmin ? (
            <div className="p-2.5 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2 sm:gap-3 items-start">
               <svg className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               <div>
                 <p className="font-medium text-xs sm:text-sm text-yellow-800">Admin Privileges Override</p>
                 <p className="text-xs text-yellow-700 mt-0.5 sm:mt-1">
                   Admins have full access.
                 </p>
               </div>
            </div>
          ) : (
            <div className="flex gap-1.5 sm:gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAll}>Select All</Button>
              <Button size="sm" variant="outline" onClick={handleClearAll}>Clear All</Button>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 pb-2">
            {PERMISSION_MODULES.map(({ module, label, actions }) => (
              <div 
                key={module} 
                className={`p-3 sm:p-4 rounded-lg border transition-all ${
                  permissions[module]?.length > 0 
                    ? 'bg-white border-indigo-200 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasAll(module, actions)}
                      onChange={() => handleToggleModule(module, actions)}
                      disabled={isAdmin}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4 h-4"
                    />
                    <span className={`font-semibold text-xs sm:text-sm ${permissions[module]?.length ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {label}
                    </span>
                  </label>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-400">
                    {permissions[module]?.length || 0}/{actions.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-1.5 sm:gap-y-2 gap-x-1">
                  {actions.map(action => (
                    <label key={action} className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={hasAction(module, action) || false}
                        onChange={() => handleToggleAction(module, action)}
                        disabled={isAdmin}
                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-3.5 h-3.5"
                      />
                      <span className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        {ACTION_LABELS[action]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
            <span className="font-medium text-indigo-600">{totalActions}</span> permissions active
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-end">
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