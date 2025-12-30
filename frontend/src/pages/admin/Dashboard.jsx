import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    lowStockCount: 0,
    recentSales: [],
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
      
      // Fetch recent sales
      const salesResponse = await api.get('/sales?limit=10');

      setStats({
        todaySales: reportResponse.summary?.totalSales || 0,
        todayProfit: reportResponse.summary?.totalProfit || 0,
        lowStockCount: lowStockResponse.count || 0,
        recentSales: salesResponse.sales || [],
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Sales */}
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Today's Sales</p>
                <p className="text-3xl font-bold mt-2">
                  GH₵ {parseFloat(stats.todaySales).toFixed(2)}
                </p>
              </div>
              <div className="text-5xl opacity-20">💰</div>
            </div>
          </div>

          {/* Today's Profit */}
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Today's Profit</p>
                <p className="text-3xl font-bold mt-2">
                  GH₵ {parseFloat(stats.todayProfit).toFixed(2)}
                </p>
              </div>
              <div className="text-5xl opacity-20">📈</div>
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
                  <p className="text-red-100 text-sm font-medium">Low Stock Items</p>
                  <p className="text-3xl font-bold mt-2">{stats.lowStockCount}</p>
                  {stats.lowStockCount > 0 && (
                    <p className="text-xs text-red-100 mt-1">Click to view</p>
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

        {/* Recent Sales */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Sales</h2>
            <Link to="/sales/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All →
            </Link>
          </div>

          {stats.recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales yet today</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sold By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(sale.saleDate), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        GH₵ {parseFloat(sale.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        GH₵ {parseFloat(sale.totalProfit).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.soldBy?.fullName || sale.soldBy?.username || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}