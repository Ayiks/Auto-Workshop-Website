import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@stores/authStore";
import { reportsApi } from "@api/reports";
import LoadingSpinner from "@components/common/LoadingSpinner";
import { format } from "date-fns";
import { useResponsive } from "@hooks/useResponsive";
import { RESPONSIVE_SPACING } from "@utils/responsiveHelpers";

// --- HELPER COMPONENT FOR TRENDS ---
const TrendBadge = ({ value }) => {
  const numValue = Number(value || 0);
  const isPositive = numValue > 0;
  const isNegative = numValue < 0;
  const isNeutral = numValue === 0;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Stable
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      isPositive 
        ? 'bg-green-50 text-green-700 border-green-100' 
        : 'bg-red-50 text-red-700 border-red-100'
    }`}>
      {isPositive ? (
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
      ) : (
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
      )}
      {Math.abs(numValue).toFixed(1)}%
    </span>
  );
};

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  
  // Logic: Check if user is Admin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: reportsApi.getDashboard,
    // refetchInterval: 10000, // Refresh data every 10 seconds
  });

  const stats = data?.data;

  // --- QUICK ACTIONS CONFIGURATION ---
  const quickActions = [
    { 
      label: "New Sale", 
      sub: "Process order", 
      icon: "M12 4v16m8-8H4", 
      action: () => navigate('/app/sales/new'),
      allowed: true // Everyone can sell
    },
    { 
      label: "New Job", 
      sub: "Create service", 
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", 
      action: () => navigate('/app/jobs'),
      allowed: true // Everyone can create jobs
    },
    { 
      label: "Add Stock", 
      sub: "Update inventory", 
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", 
      action: () => navigate('/app/materials'),
      allowed: isAdmin // Only Admin
    },
    { 
      label: "Reports", 
      sub: "View analytics", 
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z", 
      action: () => navigate('/app/finance'),
      allowed: isAdmin // Only Admin
    }
  ];

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="p-6 text-red-600">Error loading dashboard</div>;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className={`container mx-auto ${RESPONSIVE_SPACING.container}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            <div>
              {/* Dynamic Title based on Role */}
              <h1 className={`${RESPONSIVE_SPACING.subheading} font-bold text-gray-900 tracking-tight`}>
                {isAdmin ? "Overview" : "Today's Activity"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Welcome back, {user?.fullName || user?.username}</p>
            </div>

            {/* Admin sees Date Range, Staff sees "Today" badge */}
            {isAdmin ? (
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100/50 border border-gray-200 px-3 py-1.5 rounded-full whitespace-nowrap">
                 <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {stats?.period?.startDate && stats?.period?.endDate 
                    ? `${format(new Date(stats.period.startDate), "MMM d")} - ${format(new Date(stats.period.endDate), "MMM d, yyyy")}`
                    : "Loading..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Today: {format(new Date(), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`container mx-auto ${RESPONSIVE_SPACING.container} ${RESPONSIVE_SPACING.section} space-y-6 sm:space-y-8`}>
        
        {/* ================================================================================== */}
        {/* VIEW LOGIC: If Admin -> Show Full Dashboard. If Staff -> Show Daily Overview only  */}
        {/* ================================================================================== */}

        {!isAdmin ? (
           /* --- STAFF VIEW (DAILY + OUTSTANDING) --- */
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {/* 1. Daily Total Revenue */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="font-medium text-indigo-100 text-xs sm:text-sm">Total Revenue (Today)</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">GH₵{Number(stats?.dailyOverview?.totalRevenue || 0).toLocaleString()}</h2>
              </div>

              {/* 2. Daily Sales Count */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Sales Processed Today</p>
                  <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.dailyOverview?.salesCount || 0}</h3>
                      <span className="text-xs sm:text-sm text-gray-400">transactions</span>
                  </div>
              </div>

              {/* 3. Daily Sales Revenue */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Sales Revenue Today</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">GH₵{Number(stats?.dailyOverview?.salesRevenue || 0).toLocaleString()}</h3>
              </div>

              {/* 4. Daily Jobs Count */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Jobs Active Today</p>
                   <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.dailyOverview?.jobCount || 0}</h3>
                      <span className="text-xs sm:text-sm text-gray-400">services</span>
                  </div>
              </div>

              {/* 5. Daily Job Revenue */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Job Revenue Today</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">GH₵{Number(stats?.dailyOverview?.jobRevenue || 0).toLocaleString()}</h3>
              </div>

              {/* 6. Outstanding Payments (Global) */}
              <div className="bg-white rounded-xl border border-red-100 p-4 sm:p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4"></div>
                  <p className="text-xs sm:text-sm font-medium text-red-600 mb-1 relative z-10">Outstanding Collections</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 relative z-10">GH₵{Number(stats?.outstanding?.amount || 0).toLocaleString()}</h3>
                  <p className="text-xs text-gray-400 mt-2 relative z-10">
                      {stats?.outstanding?.count || 0} pending invoices
                  </p>
              </div>
           </div>
        ) : (
          /* --- ADMIN VIEW (FULL DASHBOARD) --- */
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
              
              {/* 1. Daily Revenue (Today vs Yesterday) */}
              <div className="bg-white rounded-xl border border-indigo-100 p-4 sm:p-6 shadow-sm hover:border-indigo-300 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <svg className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <TrendBadge value={stats?.dailyRevenue?.trend} />
                </div>
                <div className="relative z-10">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Daily Revenue</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-indigo-900 mt-1 tracking-tight">GH₵{Number(stats?.dailyRevenue?.amount || 0).toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-1">earned today</p>
                </div>
              </div>

              {/* 2. Total Sales Count (This Month vs Last Month) */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:border-gray-300 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <svg className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <TrendBadge value={stats?.sales?.countTrend} />
                </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Total Sales</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats?.sales?.count || 0}</h3>
                    <p className="text-xs text-gray-400 mt-1">transactions</p>
                </div>
              </div>

              {/* 3. Sales Revenue (This Month vs Last Month) */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:border-gray-300 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <svg className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <TrendBadge value={stats?.sales?.revenueTrend} />
                </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Sales Revenue</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">GH₵{Number(stats?.sales?.revenue || 0).toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-1">gross revenue</p>
                </div>
              </div>

              {/* 4. Total Jobs Count (This Month vs Last Month) */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:border-gray-300 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <svg className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <TrendBadge value={stats?.jobs?.countTrend} />
                </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Total Jobs</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stats?.jobs?.count || 0}</h3>
                    <p className="text-xs text-gray-400 mt-1">active & completed</p>
                </div>
              </div>

              {/* 5. Job Revenue (This Month vs Last Month) */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:border-gray-300 transition-all duration-200">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <svg className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </div>
                    <TrendBadge value={stats?.jobs?.revenueTrend} />
                </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Job Revenue</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tracking-tight">GH₵{Number(stats?.jobs?.revenue || 0).toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-1">service earnings</p>
                </div>
              </div>
            </div>

            {/* Secondary Row (Admin Only) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {/* Total Revenue Summary */}
                <div className="bg-black rounded-xl p-4 sm:p-6 shadow-lg text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                       <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                   </div>
                   <div className="relative z-10">
                       <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">Net Revenue</p>
                       <div className="flex items-baseline gap-2 mt-2">
                           <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">GH₵{Number(stats?.totalRevenue || 0).toLocaleString()}</h3>
                       </div>
                       <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs font-medium text-gray-400 border-t border-gray-800 pt-4">
                           <span>Sales: {(stats?.sales?.revenue || 0).toLocaleString()}</span>
                           <span className="hidden sm:inline w-1 h-1 rounded-full bg-gray-600"></span>
                           <span>Jobs: {(stats?.jobs?.revenue || 0).toLocaleString()}</span>
                       </div>
                   </div>
                </div>

                {/* Outstanding Payments */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                       <div>
                           <p className="text-sm font-semibold text-gray-900">Outstanding Payments</p>
                           <p className="text-xs text-gray-500 mt-1">Pending collections</p>
                       </div>
                       {Number(stats?.outstanding?.amount) > 0 ? (
                           <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-100 whitespace-nowrap">Action Required</span>
                       ) : (
                           <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded border border-green-100 whitespace-nowrap">All Good</span>
                       )}
                   </div>
                   <div className="mt-4">
                       <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">GH₵{Number(stats?.outstanding?.amount || 0).toLocaleString()}</p>
                       <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                           <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                       </div>
                   </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                       <div>
                           <p className="text-sm font-semibold text-gray-900">Inventory Health</p>
                           <p className="text-xs text-gray-500 mt-1">Stock level alerts</p>
                       </div>
                       <span className={`px-2 py-1 text-xs font-semibold rounded border whitespace-nowrap ${Number(stats?.alerts?.lowStockMaterials) > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                           {stats?.alerts?.lowStockMaterials || 0} Alerts
                       </span>
                   </div>
                   <div className="mt-4 flex items-end gap-2">
                       <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{stats?.alerts?.lowStockMaterials || 0}</p>
                       <span className="text-xs sm:text-sm text-gray-500 mb-1">items below threshold</span>
                   </div>
                </div>
            </div>
          </>
        )}
        
        {/* Quick Actions (Filtered by Permissions) */}
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {quickActions
                  .filter(action => action.allowed) // Only show allowed actions
                  .map((action, idx) => (
                    <button 
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault();
                          action.action();
                        }}
                        className="group flex flex-col items-start p-3 sm:p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-200 text-left"
                    >
                        <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg group-hover:bg-black group-hover:text-white transition-colors duration-200 mb-2 sm:mb-3 text-gray-700">
                            <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} /></svg>
                        </div>
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">{action.label}</span>
                        <span className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.sub}</span>
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}