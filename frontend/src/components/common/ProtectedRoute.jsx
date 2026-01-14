import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';

export default function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuthStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check permission if required
  if (requiredPermission) {
    const [module, action] = requiredPermission.split(':');
    if (!hasPermission(module, action)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to perform this action.</p>
          </div>
        </div>
      );
    }
  }

  return children;
}