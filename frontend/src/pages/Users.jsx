// src/pages/Users.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@api/users';
import { useAuthStore } from '@stores/authStore';
import { useResponsive } from '@hooks/useResponsive';
import { RESPONSIVE_SPACING } from '@utils/responsiveHelpers';
import { toast } from 'react-hot-toast';
import Modal from '@components/common/Modal';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';
import UserForm from '@components/features/users/UserForm';
import PermissionsModal from '@components/features/users/PermissionsModal';
import ChangePasswordModal from '@components/features/users/ChangePasswordModal';
import { format } from 'date-fns';
import Button from '@components/common/Button';
import Card from '@components/common/Card';

const ROLE_LABELS = {
  admin: 'Admin',
  sales: 'Sales',
  mechanic: 'Mechanic',
  sprayer: 'Sprayer',
  bodyworks: 'Body Works',
};

const ROLE_BADGES = {
  admin: 'bg-gray-900 text-white',
  sales: 'bg-blue-50 text-blue-700 border border-blue-100',
  mechanic: 'bg-orange-50 text-orange-700 border border-orange-100',
  sprayer: 'bg-green-50 text-green-700 border border-green-100',
  bodyworks: 'bg-purple-50 text-purple-700 border border-purple-100',
};

export default function Users() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // --- 1. Fetch ALL Users Once ---
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'], // Removed filters from key so it doesn't refetch on type
    queryFn: () => usersApi.getUsers({}), // Fetch all
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getUserStats(),
  });

  const allUsers = usersData?.data || [];
  const stats = statsData?.data || {};

  // --- 2. Client-Side Filtering (Instant & Case Insensitive) ---
  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      // Role Filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'true';
        if (user.isActive !== isActive) return false;
      }

      // Search Filter (Case Insensitive)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesUsername = user.username?.toLowerCase().includes(searchLower);
        const matchesName = user.fullName?.toLowerCase().includes(searchLower);
        const matchesEmail = user.email?.toLowerCase().includes(searchLower);
        
        if (!matchesUsername && !matchesName && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [allUsers, roleFilter, statusFilter, searchTerm]);


  // --- Mutations (Unchanged) ---
  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['user-stats']);
      setShowCreateModal(false);
      toast.success('User created successfully');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowEditModal(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update user'),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['user-stats']);
      toast.success('User deactivated');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to deactivate user'),
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['user-stats']);
      toast.success('User activated');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to activate user'),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['user-stats']);
      toast.success('User removed');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to remove user'),
  });

  // Handlers
  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleManagePermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  const handleToggleStatus = (user) => {
    if (user.isActive) {
      if (window.confirm(`Deactivate user ${user.username}?`)) {
        deactivateMutation.mutate(user.id);
      }
    } else {
      if (window.confirm(`Activate user ${user.username}?`)) {
        activateMutation.mutate(user.id);
      }
    }
  };

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to delete user ${user.username}? This action cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <LoadingSpinner size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage staff accounts and permissions</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-2 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export
              </button>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="bg-gray-900 hover:bg-black text-white shadow-sm border-transparent"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
              >
                New User
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white border border-gray-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers || 0}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-gray-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeUsers || 0}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg border border-green-100 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-gray-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inactive</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inactiveUsers || 0}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg border border-red-100 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-gray-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Roles</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.usersByRole?.length || 0}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
            </Card>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                  <option value="mechanic">Mechanic</option>
                  <option value="sprayer">Sprayer</option>
                  <option value="bodyworks">Body Works</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          {filteredUsers.length === 0 ? (
            <div className="py-16">
              <EmptyState
                title={searchTerm ? "No users found" : "No users yet"}
                description={searchTerm ? "Try adjusting your search criteria" : "Create the first user to get started"}
                action={searchTerm ? null : () => setShowCreateModal(true)}
                actionText="Create User"
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                {(user.fullName || user.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                {user.fullName && <div className="text-xs text-gray-500">{user.fullName}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {user.email && <div className="text-gray-900">{user.email}</div>}
                          {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                          {!user.email && !user.phone && <span className="text-xs text-gray-400 italic">No contact info</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGES[user.role] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Sales: <span className="font-medium text-gray-900">{user._count?.salesMade || 0}</span></div>
                            <div>Jobs: <span className="font-medium text-gray-900">{user._count?.jobsAssigned || 0}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm') : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            user.isActive 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 transition-opacity">
                            {user.id !== currentUser?.id ? (
                              <>
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                {user.role !== 'admin' && (
                                  <button
                                    onClick={() => handleManagePermissions(user)}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Permissions"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleChangePassword(user)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Change Password"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className={`p-1.5 rounded transition-colors ${
                                    user.isActive
                                      ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                  }`}
                                  title={user.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {user.isActive ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded select-none border border-gray-200">YOU</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>Showing {filteredUsers.length} records</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals remain unchanged in logic, just ensuring they are rendered */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create User" size="md">
        <div className="p-1">
          <UserForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowCreateModal(false)} isLoading={createMutation.isPending} />
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null); }} title="Edit User" size="md">
        <div className="p-1">
          <UserForm user={selectedUser} onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })} onCancel={() => { setShowEditModal(false); setSelectedUser(null); }} isLoading={updateMutation.isPending} />
        </div>
      </Modal>

      {selectedUser && (
        <PermissionsModal isOpen={showPermissionsModal} onClose={() => { setShowPermissionsModal(false); setSelectedUser(null); }} user={selectedUser} />
      )}

      {selectedUser && (
        <ChangePasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }} user={selectedUser} />
      )}
    </div>
  );
}