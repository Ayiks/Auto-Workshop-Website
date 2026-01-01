import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayProfit: 0,
    todayExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
    materialSalesCount: 0,
    jobSalesCount: 0,
    recentSales: [],
    recentJobs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch today's report
      const today = new Date().toISOString().split('T')[0];
      const reportResponse = await api.get(`/sales/reports/daily?date=${today}`);
      
      // Fetch low stock materials
      const lowStockResponse = await api.get('/materials/low-stock');
      
      // Fetch recent sales (material sales)
      const salesResponse = await api.get('/sales?limit=5');

      // Fetch recent paid invoices (job sales)
      const invoicesResponse = await api.get('/invoices?paymentStatus=paid&limit=5');

      const summary = reportResponse.summary || {};
      console.log('Dashboard Summary:', summary);

      setStats({
        todayRevenue: summary.totalRevenue || 0,
        todayProfit: summary.grossProfit || 0,
        todayExpenses: summary.expenses?.totalExpenses || 0,
        netProfit: summary.netProfit || 0,
        lowStockCount: lowStockResponse.count || 0,
        materialSalesCount: summary.materialSales?.transactionCount || 0,
        jobSalesCount: summary.jobSales?.transactionCount || 0,
        recentSales: salesResponse.sales || [],
        recentJobs: invoicesResponse.invoices || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* Stats Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Today's Revenue */}
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Today's Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  GH₵ {parseFloat(stats.todayRevenue).toFixed(2)}
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  {stats.materialSalesCount} materials + {stats.jobSalesCount} jobs
                </p>
              </div>
              <div className="text-5xl opacity-20">💰</div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Gross Profit</p>
                <p className="text-3xl font-bold mt-2">
                  GH₵ {parseFloat(stats.todayProfit).toFixed(2)}
                </p>
                <p className="text-xs text-green-100 mt-1">Before expenses</p>
              </div>
              <div className="text-5xl opacity-20">📈</div>
            </div>
          </div>

          {/* Net Profit */}
          <div className={`card ${
            stats.netProfit >= 0 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
              : 'bg-gradient-to-br from-red-500 to-red-600'
          } text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Net Profit</p>
                <p className="text-3xl font-bold mt-2">
                  GH₵ {parseFloat(stats.netProfit).toFixed(2)}
                </p>
                <p className="text-xs text-white mt-1">
                  After GH₵{parseFloat(stats.todayExpenses).toFixed(2)} expenses
                </p>
              </div>
              <div className="text-5xl opacity-20">💎</div>
            </div>
          </div>

          {/* Low Stock Alert */}
          <Link to="/materials" className="block">
            <div className={`card ${
              stats.lowStockCount > 0 
                ? 'bg-gradient-to-br from-red-500 to-red-600' 
                : 'bg-gradient-to-br from-gray-500 to-gray-600'
            } text-white hover:scale-105 transition-transform cursor-pointer`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Low Stock Items</p>
                  <p className="text-3xl font-bold mt-2">{stats.lowStockCount}</p>
                  {stats.lowStockCount > 0 && (
                    <p className="text-xs text-white mt-1">Click to view</p>
                  )}
                </div>
                <div className="text-5xl opacity-20">⚠️</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/materials" className="btn-primary btn-touch text-center">
            📦 Manage Materials
          </Link>
          <Link to="/sales" className="btn-success btn-touch text-center">
            💰 New Sale
          </Link>
          <Link to="/reports" className="btn-secondary btn-touch text-center">
            📊 View Reports
          </Link>
          <Link to="/jobs" className="btn-secondary btn-touch text-center">
            🔧 View Jobs
          </Link>
        </div>

        {/* Recent Activity - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Material Sales */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Material Sales
              </h2>
              <Link to="/sales/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All →
              </Link>
            </div>

            {stats.recentSales.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No material sales today</p>
            ) : (
              <div className="space-y-3">
                {stats.recentSales.map((sale) => (
                  <div key={sale.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sale.items?.length || 0} items
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(sale.saleDate), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          GH₵ {parseFloat(sale.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          +GH₵ {parseFloat(sale.totalProfit).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      By: {sale.soldBy?.fullName || sale.soldBy?.username || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Job Sales (Paid Invoices) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Job Sales
              </h2>
              <Link to="/jobs?status=invoiced" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All →
              </Link>
            </div>

            {stats.recentJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No job sales today</p>
            ) : (
              <div className="space-y-3">
                {stats.recentJobs.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.job?.clientName || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.paidDate && format(new Date(invoice.paidDate), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          GH₵ {parseFloat(invoice.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          +GH₵ {parseFloat(invoice.totalProfit).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {invoice.job?.carMake && (
                      <p className="text-xs text-gray-500 mt-2">
                        {invoice.job.carMake} {invoice.job.carModel}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Today's Breakdown */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Material Sales */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Material Sales</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {stats.materialSalesCount}
              </p>
              <p className="text-xs text-blue-700 mt-1">transactions</p>
            </div>

            {/* Job Sales */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-900">Job Sales</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {stats.jobSalesCount}
              </p>
              <p className="text-xs text-purple-700 mt-1">completed & paid</p>
            </div>

            {/* Total Expenses */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-900">Expenses</p>
              <p className="text-2xl font-bold text-red-900 mt-2">
                GH₵ {parseFloat(stats.todayExpenses).toFixed(2)}
              </p>
              <p className="text-xs text-red-700 mt-1">total spent</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}