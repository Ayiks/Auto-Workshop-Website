import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Public pages
import Home from './pages/public/Home';
import Services from './pages/public/Services';
import Booking from './pages/public/Booking';
import Contact from './pages/public/Contact';

// Auth pages
import Login from './pages/auth/Login';

// Protected pages
import AdminDashboard from './pages/admin/Dashboard';
import Materials from './pages/admin/Materials';
import Reports from './pages/admin/Reports';
import Expenses from './pages/admin/Expenses';
import SalesInterface from './pages/sales/SalesInterface';
import SalesHistory from './pages/sales/SalesHistory';
import Jobs from './pages/mechanic/Jobs';
import CreateJob from './pages/mechanic/CreateJob';
import JobDetails from './pages/mechanic/JobDetails';
import Invoice from './pages/mechanic/Invoice';

// Components
import ProtectedRoute from './components/protected/ProtectedRoute';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/contact" element={<Contact />} />

      {/* Auth routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' && <AdminDashboard />}
            {user?.role === 'sales' && <SalesInterface />}
            {user?.role === 'mechanic' && <Jobs />}
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/materials"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Materials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Expenses />
          </ProtectedRoute>
        }
      />

      {/* Sales routes */}
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={['admin', 'sales']}>
            <SalesInterface />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/history"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SalesHistory />
          </ProtectedRoute>
        }
      />

      {/* Mechanic routes */}
      <Route
        path="/jobs"
        element={
          <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
            <Jobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/create"
        element={
          <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
            <CreateJob />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
            <JobDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id/invoice"
        element={
          <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
            <JobDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
            <Invoice />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;