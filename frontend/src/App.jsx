// import { Routes, Route, Navigate } from 'react-router-dom';
// import useAuthStore from './store/authStore';

// // Public pages
// import Home from './pages/public/Home';
// import Services from './pages/public/Services';
// import Booking from './pages/public/Booking';
// import Contact from './pages/public/Contact';

// // Auth pages
// import Login from './pages/auth/Login';

// // Protected pages
// import AdminDashboard from './pages/admin/Dashboard';
// import Materials from './pages/admin/Materials';
// import Reports from './pages/admin/Reports';
// import Expenses from './pages/admin/Expenses';
// import SalesInterface from './pages/sales/SalesInterface';
// import SalesHistory from './pages/sales/SalesHistory';
// import Jobs from './pages/mechanic/Jobs';
// import CreateJob from './pages/mechanic/CreateJob';
// import JobDetails from './pages/mechanic/JobDetails';
// import Invoice from './pages/mechanic/Invoice';

// // Components
// import ProtectedRoute from './components/protected/ProtectedRoute';

// function App() {
//   const { isAuthenticated, user } = useAuthStore();

//   return (
//     <Routes>
//       {/* Public routes */}
//       <Route path="/" element={<Home />} />
//       <Route path="/services" element={<Services />} />
//       <Route path="/booking" element={<Booking />} />
//       <Route path="/contact" element={<Contact />} />

//       {/* Auth routes */}
//       <Route 
//         path="/login" 
//         element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
//       />

//       {/* Protected routes */}
//       <Route
//         path="/dashboard"
//         element={
//           <ProtectedRoute>
//             {user?.role === 'admin' && <AdminDashboard />}
//             {user?.role === 'sales' && <SalesInterface />}
//             {user?.role === 'mechanic' && <Jobs />}
//           </ProtectedRoute>
//         }
//       />

//       {/* Admin routes */}
//       <Route
//         path="/materials"
//         element={
//           <ProtectedRoute allowedRoles={['admin']}>
//             <Materials />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/reports"
//         element={
//           <ProtectedRoute allowedRoles={['admin']}>
//             <Reports />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/expenses"
//         element={
//           <ProtectedRoute allowedRoles={['admin']}>
//             <Expenses />
//           </ProtectedRoute>
//         }
//       />

//       {/* Sales routes */}
//       <Route
//         path="/sales"
//         element={
//           <ProtectedRoute allowedRoles={['admin', 'sales']}>
//             <SalesInterface />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/sales/history"
//         element={
//           <ProtectedRoute allowedRoles={['admin']}>
//             <SalesHistory />
//           </ProtectedRoute>
//         }
//       />

//       {/* Mechanic routes */}
//       <Route
//         path="/jobs"
//         element={
//           <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
//             <Jobs />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/jobs/create"
//         element={
//           <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
//             <CreateJob />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/jobs/:id"
//         element={
//           <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
//             <JobDetails />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/jobs/:id/invoice"
//         element={
//           <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
//             <JobDetails />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/invoices/:id"
//         element={
//           <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
//             <Invoice />
//           </ProtectedRoute>
//         }
//       />

//       {/* 404 */}
//       <Route path="*" element={<Navigate to="/" />} />
//     </Routes>
//   );
// }

// export default App;

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@stores/authStore';

// Components
import ProtectedRoute from '@components/common/ProtectedRoute';

// Pages
import LandingPage from '@pages/LandingPage';
import Login from '@pages/Login';
import Dashboard from '@pages/Dashboard';
import Materials from '@pages/Materials';
import Sales from '@pages/Sales';
import SalesForm from '@pages/sales/SalesForm';
import Jobs from '@pages/Jobs';
import Invoices from '@pages/Invoices';
import Finance from '@/pages/Finance';
import Expenses from '@pages/Expenses';
import Users from '@pages/Users';
import Settings from '@pages/Settings';
import BoothServices from '@pages/BoothServices';
import DashboardLayout from '@components/layout/DashboardLayout';


// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { initAuth, isLoading } = useAuthStore();

  // Initialize auth on app load
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />

          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="materials" element={<Materials />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<SalesForm />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path='invoices' element={<Invoices />} />
            <Route path='finance' element={<Finance />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
            <Route path="booth" element={<BoothServices />} />
            
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;