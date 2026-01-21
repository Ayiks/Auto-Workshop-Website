// src/pages/Finance.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@api/reports';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Card, { StatCard } from '@components/common/Card';
import LoadingSpinner from '@components/common/LoadingSpinner';
import ChartCard from '@components/features/finance/ChartCard';
import ReportFilters from '@components/features/finance/ReportFilters';
import {
  exportSalesReport,
  exportJobsReport,
  exportExpensesReport,
  exportProfitLoss,
  exportMaterialUsage
} from '@utils/exportUtils';

// Modern minimalist color palette
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const NEUTRAL_COLORS = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B'];

export default function Finance() {
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const [activeTab, setActiveTab] = useState('overview');

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-report', dateRange],
    queryFn: () => reportsApi.getSalesReport(dateRange),
  });

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs-report', dateRange],
    queryFn: () => reportsApi.getJobReport(dateRange),
  });

  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses-report', dateRange],
    queryFn: () => reportsApi.getExpenseReport(dateRange),
  });

  const { data: plData, isLoading: loadingPL } = useQuery({
    queryKey: ['pl-statement', dateRange],
    queryFn: () => reportsApi.getProfitLoss(dateRange),
  });

  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue-breakdown', dateRange],
    queryFn: () => reportsApi.getRevenue(dateRange),
  });

  const { data: materialUsageData, isLoading: loadingMaterialUsage } = useQuery({
    queryKey: ['material-usage', dateRange],
    queryFn: () => reportsApi.getMaterialUsageReport(dateRange),
  });

  const sales = {
    ...salesData?.data?.summary || {},
    totalSales: salesData?.data?.summary?.totalTransactions || 0,
    totalRevenue: salesData?.data?.summary?.totalSalesRevenue || 0,
    averageSale: (salesData?.data?.summary?.totalSalesRevenue || 0) / (salesData?.data?.summary?.totalTransactions || 1),
    breakdown: salesData?.data?.breakdown,
    dailyTrend: salesData?.data?.dailyTrend,
    recentSales: salesData?.data?.recentSales,
    salesByMethod: salesData?.data?.salesByMethod,
  };
  
  const jobs = {
    ...jobsData?.data?.summary || {},
    totalRevenue: jobsData?.data?.summary?.totalJobRevenue || 0,
    totalMaterialsCost: jobsData?.data?.summary?.totalMaterialsCost || 0,
    totalLabourCost: jobsData?.data?.summary?.totalLabourCost || 0,
    averageJob: (jobsData?.data?.summary?.totalJobRevenue || 0) / (jobsData?.data?.summary?.totalJobs || 1),
    totalOutstanding: jobsData?.data?.summary?.totalOutstanding || 0,
    totalPaid: jobsData?.data?.summary?.totalPaid || 0,
    // Payment status mapping
    unpaidJobs: jobsData?.data?.data?.paymentStatusBreakdown?.unpaid?.count || 0,
    unpaidAmount: jobsData?.data?.data?.paymentStatusBreakdown?.unpaid?.amount || 0,
    partialJobs: jobsData?.data?.data?.paymentStatusBreakdown?.partial?.count || 0,
    partialAmount: jobsData?.data?.data?.paymentStatusBreakdown?.partial?.amountDue || 0,
    paidJobs: jobsData?.data?.data?.paymentStatusBreakdown?.paid?.count || 0,
    paidAmount: jobsData?.data?.data?.paymentStatusBreakdown?.paid?.amount || 0,
    revenueByType: jobsData?.data?.data?.revenueByType,
    materialUsage: jobsData?.data?.data?.materialUsage,
    paymentStatusBreakdown: jobsData?.data?.data?.paymentStatusBreakdown,
    recentJobs: jobsData?.data?.data?.recentJobs,
  };
  
  const expenses = {
    ...expensesData?.data?.summary || {},
    breakdown: expensesData?.data?.data?.breakdown,
    monthlyTrend: expensesData?.data?.data?.monthlyTrend,
    recentExpenses: expensesData?.data?.data?.recentExpenses,
    allExpenses: expensesData?.data?.data?.allExpenses,
  };
  
  const pl = {
    ...plData?.data?.summary || {},
    materialsSales: plData?.data?.data?.revenue?.counterSalesBreakdown?.materials || 0,
    boothSales: plData?.data?.data?.revenue?.counterSalesBreakdown?.booth || 0,
    jobsRevenue: plData?.data?.data?.revenue?.sources?.jobs || 0,
    revenue: plData?.data?.data?.revenue,
    costs: plData?.data?.data?.costs,
    profitability: plData?.data?.data?.profitability,
  };

  console.log('expenses', expenses);
  console.log('pl', pl);
  console.log('sales', sales);
  console.log('jobs', jobs);
  
  
  
  
  
  const revenueRaw = revenueData?.data || {};
  const materialUsage = materialUsageData?.data || {};
  console.log('materials', materialUsage)

  console.log(materialUsageData)

  const revenue = {
    materialsSales: revenueRaw.sources?.materials?.amount || 0,
    materialsPercentage: revenueRaw.sources?.materials?.percentage || 0,
    boothSales: revenueRaw.sources?.booth?.amount || 0,
    boothPercentage: revenueRaw.sources?.booth?.percentage || 0,
    jobsRevenue: revenueRaw.sources?.jobs?.amount || 0,
    jobsPercentage: revenueRaw.sources?.jobs?.percentage || 0,
    totalRevenue: revenueRaw.totalRevenue || 0,
  };

  const isLoading = loadingSales || loadingJobs || loadingExpenses || loadingPL || loadingRevenue || loadingMaterialUsage;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" text="Loading financial data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Complete overview and analytics for {format(new Date(dateRange.startDate), 'MMM d')} - {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Date Range Filters */}
          <ReportFilters 
            dateRange={dateRange}
            onDateChange={setDateRange}
          />
        </div>

        {/* Minimalist Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 border border-gray-200 w-fit">
            {[
              { id: 'overview', label: 'Overview'},
              { id: 'sales', label: 'Sales'},
              { id: 'jobs', label: 'Jobs'},
              { id: 'expenses', label: 'Expenses'},
              { id: 'pl', label: 'P&L'},
              { id: 'materials', label: 'Materials'},
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'overview' && (
            <OverviewTab pl={pl} revenue={revenue} sales={sales} jobs={jobs} expenses={expenses} />
          )}
          {activeTab === 'sales' && (
            <SalesTab sales={sales} dateRange={dateRange} />
          )}
          {activeTab === 'jobs' && (
            <JobsTab jobs={jobs} dateRange={dateRange} />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTab expenses={expenses} dateRange={dateRange} />
          )}
          {activeTab === 'pl' && (
            <PLTab pl={pl} dateRange={dateRange} />
          )}
          {activeTab === 'materials' && (
            <MaterialUsageTab materialUsage={materialUsage} dateRange={dateRange} />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ pl, revenue, sales, jobs, expenses }) {
  const revenueChartData = [
    { name: 'Materials', value: Number(revenue.materialsSales || 0), percentage: revenue.materialsPercentage || 0 },
    { name: 'Booth', value: Number(revenue.boothSales || 0), percentage: revenue.boothPercentage || 0 },
    { name: 'Jobs', value: Number(revenue.jobsRevenue || 0), percentage: revenue.jobsPercentage || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Gross Revenue</span>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(pl.grossRevenue || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Previous period: +12.5%</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-green-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Gross Profit</span>
            <div className="p-2 bg-green-50 rounded-lg">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(pl.grossProfit || 0).toLocaleString()}</div>
          <div className="text-sm text-green-600 font-medium">{pl.grossProfitMargin || 0}% margin</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Net Profit</span>
            <div className={`p-2 rounded-lg ${Number(pl.netProfit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <svg className={`w-4 h-4 ${Number(pl.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className={`text-2xl font-bold ${Number(pl.netProfit || 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            GH₵{Number(pl.netProfit || 0).toLocaleString()}
          </div>
          <div className={`text-sm font-medium ${Number(pl.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {pl.netProfitMargin || 0}% margin
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Total Expenses</span>
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number((pl.costs?.totalCosts || pl.cogs + pl.operationalExpenses) || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">COGS + Operational</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Distribution</h3>
              <p className="text-sm text-gray-500">By revenue source</p>
            </div>
            {/* <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View details →
            </button> */}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  labelLine={false}
                >
                  {revenueChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `GH₵${Number(value).toLocaleString()}`}
                  contentStyle={{ 
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
            <p className="text-sm text-gray-500">Detailed revenue sources</p>
          </div>
          <div className="space-y-4">
            {revenueChartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.percentage}% of total</div>
                  </div>
                </div>
                <div className="font-bold text-gray-900">GH₵{Number(item.value).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sales Summary</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-600">💰</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Sales</span>
              <span className="font-semibold">{sales.totalSales || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold">GH₵{Number(sales.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Average Sale</span>
              <span className="font-semibold">GH₵{Number(sales.averageSale || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Jobs Summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Jobs Summary</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-600">🔧</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Jobs</span>
              <span className="font-semibold">{jobs.totalJobs || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold">GH₵{Number(jobs.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Average Job</span>
              <span className="font-semibold">GH₵{Number(jobs.averageJob || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Expenses Overview</h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-600">📉</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">COGS</span>
              <span className="font-semibold">GH₵{Number(expenses.cogTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Operational</span>
              <span className="font-semibold">GH₵{Number(expenses.operationalTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Total Expenses</span>
              <span className="font-semibold">GH₵{Number(expenses.totalExpenses || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// P&L Tab Component
function PLTab({ pl, dateRange }) {
  const handleExport = () => {
    exportProfitLoss(pl, dateRange);
  };

  const profitLossItems = [
    { label: 'Materials Sales', value: pl.materialsSales || 0, type: 'revenue' },
    { label: 'Booth Services', value: pl.boothSales || 0, type: 'revenue' },
    { label: 'Jobs Revenue', value: pl.jobsRevenue || 0, type: 'revenue' },
    { label: 'Cost of Goods Sold', value: pl.cogs || 0, type: 'expense' },
    { label: 'Operational Expenses', value: pl.operationalExpenses || 0, type: 'expense' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Profit & Loss Statement</h2>
            <p className="text-gray-500 mt-1">Financial performance overview</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule
              </span>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* P&L Statement */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="space-y-4">
          {/* Revenue Section */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Revenue</h3>
            <div className="space-y-2">
              {profitLossItems.filter(item => item.type === 'revenue').map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded-lg">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium">GH₵{Number(item.value).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Gross Revenue</span>
                <span className="text-xl font-bold text-indigo-600">GH₵{Number(pl.grossRevenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Expenses</h3>
            <div className="space-y-2">
              {profitLossItems.filter(item => item.type === 'expense').map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded-lg">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-red-600">GH₵{Number(item.value).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Net Profit */}
          <div className="pt-4 border-t border-gray-200">
            <div className={`p-4 rounded-lg ${Number(pl.netProfit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-900">Net Profit</div>
                  <div className="text-sm text-gray-600">{pl.netProfitMargin || 0}% margin</div>
                </div>
                <div className={`text-2xl font-bold ${Number(pl.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  GH₵{Number(pl.netProfit || 0).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {Number(pl.netProfit || 0) >= 0 
                  ? '✓ Profitable period with healthy margins'
                  : '⚠ Review expenses and revenue strategies'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Profitability Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Gross Margin</span>
                <span className="text-sm font-medium">{pl.grossProfitMargin || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(pl.grossProfitMargin || 0, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Net Margin</span>
                <span className="text-sm font-medium">{pl.netProfitMargin || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${Number(pl.netProfit || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.abs(pl.netProfitMargin || 0), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Composition</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue to COGS Ratio</span>
              <span className="text-sm font-medium">
                {pl.grossRevenue > 0 ? (Number(pl.cogs || 0) / Number(pl.grossRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Operating Expense Ratio</span>
              <span className="text-sm font-medium">
                {pl.grossRevenue > 0 ? (Number(pl.operationalExpenses || 0) / Number(pl.grossRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="font-medium text-gray-900">Profit Ratio</span>
              <span className={`font-bold ${Number(pl.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pl.netProfitMargin || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Material Usage Tab Component - Modernized
function MaterialUsageTab({ materialUsage, dateRange }) {
  const materials = materialUsage.allMaterials || [];
  const handleExport = () => exportMaterialUsage(materials, dateRange);
  

  const topMaterials = (materialUsage.topMaterials || [])
    .sort((a, b) => Number(b.totalValue) - Number(a.totalValue))
    .slice(0, 8)
    .map(m => ({
      name: m.materialName,
      value: Number(m.totalValue),
      quantity: m.totalQuantity,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Material Usage</h2>
            <p className="text-gray-500 mt-1">Consumption analysis and tracking</p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Materials</div>
          <div className="text-2xl font-bold text-gray-900">{materials.length}</div>
          <div className="text-xs text-gray-500 mt-1">Unique materials used</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Quantity</div>
          <div className="text-2xl font-bold text-gray-900">
            {materials.reduce((sum, m) => sum + m.totalQuantity, 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Units consumed</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Value</div>
          <div className="text-2xl font-bold text-gray-900">
            GH₵{materials.reduce((sum, m) => sum + Number(m.totalValue), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Inventory value used</div>
        </div>
      </div>

      {/* Chart */}
      {topMaterials.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Materials by Value</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMaterials} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'value') return [`GH₵${Number(value).toLocaleString()}`, 'Value'];
                    return [value, 'Quantity'];
                  }}
                  contentStyle={{ 
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} name="Total Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Material Usage Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Material</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">In Sales</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">In Jobs</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    No material usage data available for this period
                  </td>
                </tr>
              ) : (
                materials.slice(0, 10).map((material, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{material.materialName}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium">{material.totalQuantity}</td>
                    <td className="py-4 px-6 text-right text-gray-600">{material.usedInSales || 0}</td>
                    <td className="py-4 px-6 text-right text-gray-600">{material.usedInJobs || 0}</td>
                    <td className="py-4 px-6 text-right font-bold text-gray-900">
                      GH₵{Number(material.totalValue).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {materials.length > 10 && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all {materials.length} materials →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Sales Tab Component - Modernized
function SalesTab({ sales, dateRange }) {
  // Prepare payment method chart data with safe transformation
  const paymentMethodData = Array.isArray(sales.salesByMethod) 
    ? sales.salesByMethod.map(method => {
        const methodName = method?.method || method?.paymentMethod || 'Unknown';
        return {
          name: methodName.charAt(0).toUpperCase() + methodName.slice(1),
          revenue: Number(method?._sum.totalAmount || 0),
          count: method?._count || 0,
        };
      })
    : [];

  const handleExport = () => exportSalesReport(sales, dateRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sales Report</h2>
            <p className="text-gray-500 mt-1">Transaction analysis and revenue tracking</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare
              </span>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900">{sales.totalSales || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Transactions processed</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(sales.totalRevenue || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Gross sales amount</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Average Sale</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(sales.averageSale || 0).toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Per transaction average</div>
        </div>
      </div>

      {/* Chart */}
      {paymentMethodData.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales by Payment Method</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`GH₵${Number(value).toLocaleString()}`, 'Revenue'];
                    return [value, 'Count'];
                  }}
                  contentStyle={{ 
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sales Method Table */}
      {paymentMethodData.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales by Payment Method</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Method</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Count</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paymentMethodData.map((method, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900 capitalize">{method.name}</td>
                    <td className="py-3 px-4 text-right">{method.count}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      GH₵{Number(method.revenue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Materials Sales</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Count</span>
              <span className="font-semibold">{sales.materialSales || sales.breakdown?.materials?.count || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold">
                GH₵{Number(sales.materialRevenue || sales.breakdown?.materials?.revenue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Booth Services</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Count</span>
              <span className="font-semibold">{sales.boothSales || sales.breakdown?.booth?.count || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold">
                GH₵{Number(sales.boothRevenue || sales.breakdown?.booth?.revenue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Jobs Tab Component - Modernized
function JobsTab({ jobs, dateRange }) {
  const handleExport = () => exportJobsReport(jobs, dateRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Jobs Report</h2>
            <p className="text-gray-500 mt-1">Service jobs and revenue analysis</p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Jobs</div>
          <div className="text-2xl font-bold text-gray-900">{jobs.totalJobs || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Service jobs completed</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(jobs.totalRevenue || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">From service jobs</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Materials Used</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(jobs.totalMaterialsCost || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Material costs</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Labour Costs</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(jobs.totalLabourCost || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Service labor</div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-5 border border-red-200">
            <div className="text-sm font-medium text-red-800 mb-2">Unpaid</div>
            <div className="text-3xl font-bold text-red-900 mb-1">{jobs.unpaidJobs || 0}</div>
            <div className="text-sm text-red-700">GH₵{Number(jobs.unpaidAmount || 0).toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border border-amber-200">
            <div className="text-sm font-medium text-amber-800 mb-2">Partially Paid</div>
            <div className="text-3xl font-bold text-amber-900 mb-1">{jobs.partialJobs || 0}</div>
            <div className="text-sm text-amber-700">GH₵{Number(jobs.partialAmount || 0).toLocaleString()} due</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div className="text-sm font-medium text-green-800 mb-2">Fully Paid</div>
            <div className="text-3xl font-bold text-green-900 mb-1">{jobs.paidJobs || 0}</div>
            <div className="text-sm text-green-700">GH₵{Number(jobs.paidAmount || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Expenses Tab Component
function ExpensesTab({ expenses, dateRange }) {
  const handleExport = () => exportExpensesReport(expenses, dateRange);

  // Safely handle expenses.breakdown data
  const getBreakdownArray = () => {
    if (!expenses.breakdown) return [];
    
    if (Array.isArray(expenses.breakdown)) {
      return expenses.breakdown;
    }

    // If breakdown is an object with byCategory, use it
    if (expenses.breakdown.byCategory && Array.isArray(expenses.breakdown.byCategory)) {
      return expenses.breakdown.byCategory.map(cat => ({
        category: cat.category,
        count: cat._count || 0,
        amount: cat._sum?.amount || 0,
        percentage: cat._count > 0 ? ((cat._sum?.amount || 0) / (expenses.totalExpenses || 1) * 100).toFixed(1) : 0,
      }));
    }
    
    // If breakdown is an object, convert it to array
    if (typeof expenses.breakdown === 'object') {
      return Object.entries(expenses.breakdown).map(([category, data]) => ({
        category,
        amount: data?._sum?.amount || data?._sum || 0,
        count: data?._count || 0,
        percentage: data?.percentage || 0,
      }));
    }
    
    return [];
  };

  const breakdownArray = getBreakdownArray();
  console.log(breakdownArray);
  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Expenses Report</h2>
            <p className="text-gray-500 mt-1">Cost analysis and expense tracking</p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900">
            GH₵{Number(expenses.totalExpenses || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">All expenses combined</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">COGS</div>
          <div className="text-2xl font-bold text-gray-900">
            GH₵{Number(expenses.cogTotal || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Cost of goods sold</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Operational</div>
          <div className="text-2xl font-bold text-gray-900">
            GH₵{Number(expenses.operationalTotal || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Operating expenses</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Expenses by Category</h3>
        {breakdownArray.length > 0 ? (
          <div className="space-y-4">
            {getBreakdownArray().length > 0 ? (
  <Card>
    {/* <h2 className="text-xl font-bold text-gray-900 mb-4">Expenses by Category</h2> */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4">Category</th>
            <th className="text-right py-3 px-4">Count</th>
            <th className="text-right py-3 px-4">Amount</th>
            <th className="text-right py-3 px-4">Percentage</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {getBreakdownArray().map((cat, index) => (
            <tr key={index}>
              <td className="py-3 px-4 capitalize">
                {cat.category?.replace('_', ' ') || 'Unknown'}
              </td>
              <td className="py-3 px-4 text-right">{cat.count || 0}</td>
              <td className="py-3 px-4 text-right font-medium">
                GH₵{Number(cat.amount || 0).toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right">{cat.percentage || 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
) : null}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No expense breakdown data available for this period
          </div>
        )}
      </div>

      {/* COGS vs Operational - Also update the OverviewTab to use the same structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Cost of Goods (COGS)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Material Reorders</span>
              <span className="font-semibold">{expenses.materialReorderCount || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-semibold">
                GH₵{Number(expenses.cogTotal || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Auto-generated from material reorders
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Operational Expenses</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Entries</span>
              <span className="font-semibold">{expenses.operationalCount || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-semibold">
                GH₵{Number(expenses.operationalTotal || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Rent, utilities, salaries, etc.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

