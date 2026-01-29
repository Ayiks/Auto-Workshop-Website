import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@stores/authStore";
import { reportsApi } from "@api/reports";
import LoadingSpinner from "@components/common/LoadingSpinner";
import { format } from "date-fns";

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: reportsApi.getDashboard,
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-5 rounded-xl">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm mt-1 opacity-90">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Overview
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Welcome back, {user?.fullName || user?.username}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100/50 border border-gray-200 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {format(new Date(stats?.period?.startDate || new Date()), "MMM d")} - {format(new Date(stats?.period?.endDate || new Date()), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Sales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                </div>
                {/* Example of Green Trend Indicator */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    +12%
                </span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats?.sales?.count || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">transactions this period</p>
            </div>
          </div>

          {/* Sales Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                {/* Example of Red Trend Indicator (if revenue was down) */}
                {/* <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    -2.5%
                </span> */}
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    Stable
                </span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Sales Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">GH₵{Number(stats?.sales?.revenue || 0).toLocaleString()}</h3>
                <p className="text-xs text-gray-400 mt-1">gross revenue</p>
            </div>
          </div>

          {/* Total Jobs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    +5%
                </span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats?.jobs?.count || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">active & completed</p>
            </div>
          </div>

          {/* Job Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Job Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">GH₵{Number(stats?.jobs?.revenue || 0).toLocaleString()}</h3>
                <p className="text-xs text-gray-400 mt-1">service earnings</p>
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Total Revenue Summary */}
          <div className="bg-black rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
            {/* Subtle Texture Overlay */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            </div>
            
            <div className="relative z-10">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Net Revenue</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-white tracking-tight">GH₵{Number(stats?.totalRevenue || 0).toLocaleString()}</h3>
                </div>
                <div className="mt-6 flex items-center gap-3 text-xs font-medium text-gray-400 border-t border-gray-800 pt-4">
                    <span>Sales: {(stats?.sales?.revenue || 0).toLocaleString()}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    <span>Jobs: {(stats?.jobs?.revenue || 0).toLocaleString()}</span>
                </div>
            </div>
          </div>

          {/* Outstanding Payments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-gray-900">Outstanding Payments</p>
                    <p className="text-xs text-gray-500 mt-1">Pending collections</p>
                </div>
                {Number(stats?.outstanding?.amount) > 0 ? (
                    <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-100">Action Required</span>
                ) : (
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded border border-green-100">All Good</span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 tracking-tight">GH₵{Number(stats?.outstanding?.amount || 0).toLocaleString()}</p>
                {/* Visual Progress Bar concept */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                    <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-gray-900">Inventory Health</p>
                    <p className="text-xs text-gray-500 mt-1">Stock level alerts</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded border ${Number(stats?.alerts?.lowStockMaterials) > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {stats?.alerts?.lowStockMaterials || 0} Alerts
                </span>
            </div>
            <div className="mt-4 flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{stats?.alerts?.lowStockMaterials || 0}</p>
                <span className="text-sm text-gray-500 mb-1">items below threshold</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "New Sale", sub: "Process order", icon: "M12 4v16m8-8H4", action: () => window.location.href = '/sales' },
                    { label: "New Job", sub: "Create service", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
                    { label: "Add Stock", sub: "Update inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
                    { label: "Reports", sub: "View analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" }
                ].map((action, idx) => (
                    <button 
                        key={idx}
                        onClick={action.action}
                        className="group flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-200 text-left"
                    >
                        <div className="p-2.5 bg-gray-50 rounded-lg group-hover:bg-black group-hover:text-white transition-colors duration-200 mb-3 text-gray-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} /></svg>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{action.label}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{action.sub}</span>
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}