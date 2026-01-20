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
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {user?.fullName || user?.username}!
              </p>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
              Period:{" "}
              {format(
                new Date(stats?.period?.startDate || new Date()),
                "MMM d",
              )}{" "}
              -{" "}
              {format(
                new Date(stats?.period?.endDate || new Date()),
                "MMM d, yyyy",
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Sales */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Total Sales
                </span>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {stats?.sales?.count || 0}
                </p>
              </div>

              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                GH₵{Number(stats?.sales?.revenue || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Sales Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Sales Revenue
                </span>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  GH₵{Number(stats?.sales?.revenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                {stats?.sales?.count || 0} transactions
              </span>
            </div>
          </div>

          {/* Total Jobs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Total Jobs
                </span>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {stats?.jobs?.count || 0}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                GH₵{Number(stats?.jobs?.revenue || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Job Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Job Revenue
                </span>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  GH₵{Number(stats?.jobs?.revenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                {stats?.jobs?.count || 0} jobs
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Stats & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  GH₵{Number(stats?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-600 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">From Sales & Jobs</span>
                {/* <span className="font-medium text-gray-900">
                  GH₵{Number((stats?.sales?.revenue || 0) + (stats?.jobs?.revenue || 0)).toLocaleString()}
                </span> */}
              </div>
            </div>
          </div>

          {/* Outstanding Payments */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Outstanding Payments
                </p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  GH₵{Number(stats?.outstanding?.amount || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pending collections</span>
                <span className="text-amber-600 font-medium">
                  Requires attention
                </span>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Low Stock Items
                </p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {stats?.alerts?.lowStockMaterials || 0}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Items below threshold</span>
                <span className="text-red-600 font-medium">Restock needed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Common tasks for your workshop
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200"
               onClick = {() => window.location.href = '/sales'}
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                  New Sale
                </span>
                <span className="text-xs text-gray-400 mt-1">Counter sale</span>
               
              </button>

              <button className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">
                  New Job
                </span>
                <span className="text-xs text-gray-400 mt-1">Service job</span>
              </button>

              <button className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">
                  Add Material
                </span>
                <span className="text-xs text-gray-400 mt-1">Inventory</span>
              </button>

              <button className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                  View Reports
                </span>
                <span className="text-xs text-gray-400 mt-1">Analytics</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Stock Status</h3>
              <span className="text-sm text-gray-500">Overview</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">In Stock Items</span>
                  <span className="font-medium text-gray-900">42 items</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: "85%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Low Stock Items</span>
                  <span className="font-medium text-red-600">
                    {stats?.alerts?.lowStockMaterials || 0} items
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: "15%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
