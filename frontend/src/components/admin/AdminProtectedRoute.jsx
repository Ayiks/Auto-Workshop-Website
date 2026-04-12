import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuthStore } from '@stores/adminAuthStore';

export default function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, initAdminAuth } = useAdminAuthStore();

  useEffect(() => {
    initAdminAuth();
  }, [initAdminAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
