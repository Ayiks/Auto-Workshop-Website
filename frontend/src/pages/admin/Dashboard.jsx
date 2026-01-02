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

  // Modern Minimal Loader
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-gray-900 animate-spin"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-10">
        {/* Minimal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
            <p className="text-gray-500 text-sm mt-1">
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          <div className="flex gap-3">
             {/* Contextual Action Button could go here */}
          </div>
        </div>

        {/* Stats Grid - Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Revenue */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">
                  GH₵ {parseFloat(stats.todayRevenue).toFixed(2)}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-full text-xl">💰</div>
            </div>
            <div className="mt-4 flex items-center text-xs text-gray-400">
              <span>Materials + Labour</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Gross Profit</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">
                  GH₵ {parseFloat(stats.todayProfit).toFixed(2)}
                </h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full text-xl">📈</div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
              <span>Gross Income</span>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Net Profit</p>
                <h3 className={`text-2xl font-bold mt-2 tracking-tight ${stats.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  GH₵ {parseFloat(stats.netProfit).toFixed(2)}
                </h3>
              </div>
              <div className={`p-3 rounded-full text-xl ${stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                💎
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-gray-400">
              <span>After Expenses</span>
            </div>
          </div>

          {/* Low Stock Alert */}
          <Link to="/materials" className="group">
            <div className={`h-full rounded-2xl p-6 border shadow-sm transition-all duration-200 ${
              stats.lowStockCount > 0 
                ? 'bg-red-50 border-red-100 hover:border-red-200' 
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`${stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'} text-xs font-medium uppercase tracking-wider`}>
                    Stock Alert
                  </p>
                  <h3 className={`text-2xl font-bold mt-2 tracking-tight ${stats.lowStockCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {stats.lowStockCount}
                  </h3>
                </div>
                <div className={`p-3 rounded-full text-xl ${stats.lowStockCount > 0 ? 'bg-white/80' : 'bg-gray-50'}`}>
                  ⚠️
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                 <span className={`${stats.lowStockCount > 0 ? 'text-red-600 font-semibold group-hover:translate-x-1 transition-transform' : 'text-gray-400'}`}>
                   {stats.lowStockCount > 0 ? 'View Items →' : 'All good'}
                 </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions - Floating Pills */}
        <div className="flex flex-wrap gap-3">
          <Link to="/materials" className="px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95">
            📦 Manage Materials
          </Link>
          <Link to="/sales" className="px-6 py-3 bg-gray-900 border border-gray-900 rounded-xl shadow-sm text-sm font-medium text-white hover:bg-gray-800 transition-all active:scale-95">
            💰 New Sale
          </Link>
          <Link to="/reports" className="px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95">
            📊 Reports
          </Link>
          <Link to="/jobs" className="px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95">
            🔧 Jobs
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Sales Column (Takes up 2 cols on large screens) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Sales Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Recent Sales</h3>
                <Link to="/sales/history" className="text-xs font-medium text-gray-500 hover:text-gray-900">View All</Link>
              </div>
              
              <div className="divide-y divide-gray-50">
                {stats.recentSales.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No sales recorded today</div>
                ) : (
                  stats.recentSales.map((sale) => {
                    const hasLabour = sale.items?.some(i => i.material?.name === 'Labour/Workmanship');
                    const nonLabourItems = sale.items?.filter(i => i.material?.name !== 'Labour/Workmanship') || [];
                    const nonLabourTotal = nonLabourItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);
                    
                    if (nonLabourItems.length === 0) return null;

                    return (
                      <div key={sale.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-bold">
                            {(sale.soldBy?.username || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {nonLabourItems.length} Item{nonLabourItems.length !== 1 && 's'}
                              {hasLabour && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">JOB</span>}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(sale.saleDate), 'h:mm a')} • {sale.soldBy?.fullName || sale.soldBy?.username}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">GH₵ {nonLabourTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Jobs Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Recent Completed Jobs</h3>
                <Link to="/jobs?status=invoiced" className="text-xs font-medium text-gray-500 hover:text-gray-900">View All</Link>
              </div>

              <div className="divide-y divide-gray-50">
                {stats.recentJobs.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No jobs completed today</div>
                ) : (
                  stats.recentJobs.map((invoice) => (
                    <Link key={invoice.id} to={`/invoices/${invoice.id}`} className="block p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-lg">
                             🔧
                           </div>
                           <div>
                             <p className="text-sm font-medium text-gray-900">{invoice.job?.clientName || 'Unknown Client'}</p>
                             <p className="text-xs text-gray-400">
                               {invoice.job?.carMake} {invoice.job?.carModel} • {invoice.invoiceNumber}
                             </p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">GH₵ {parseFloat(invoice.totalAmount).toFixed(2)}</p>
                          <p className="text-[10px] text-green-600 font-medium">
                            Profit: +{parseFloat(invoice.totalProfit).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar: Breakdown & Notes */}
          <div className="space-y-8">
            
            {/* Daily Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Today's Pulse</h3>
              <div className="space-y-6">
                
                {/* Meter: Sales */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">Material Transactions</span>
                    <span className="font-bold text-gray-900">{stats.materialSalesCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                {/* Meter: Jobs */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">Jobs Invoiced</span>
                    <span className="font-bold text-gray-900">{stats.jobSalesCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.jobSalesCount > 0 ? '100%' : '5%'}` }}></div>
                  </div>
                </div>

                {/* Meter: Expenses */}
                <div className="pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-xs text-gray-500">Total Expenses</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">GH₵ {parseFloat(stats.todayExpenses).toFixed(2)}</p>
                     </div>
                     <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-xs">💸</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Note Card */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
               <div className="flex gap-3">
                 <span className="text-amber-500 mt-0.5">ℹ️</span>
                 <div>
                   <p className="text-sm font-semibold text-amber-900">Revenue Note</p>
                   <p className="text-xs text-amber-800/80 mt-2 leading-relaxed">
                     Total Revenue includes material sales and labour. External materials on invoices are excluded from revenue calculations.
                   </p>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}